import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@core/prisma/prisma.service";
import { RegisterCredentialDto } from "./dtos/register-credentail.dto";
import { LoginCredentialDto } from "./dtos/login-credential.dto";
import * as bcrypt from "bcrypt";
import { Role, UserStatus } from "@prisma/client";
import { validatePassword } from "@common/helpers/password.util";

export interface GoogleUserDetails {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterCredentialDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException("Username or email already exists");
    }

    if (!validatePassword(data.password)) {
      throw new BadRequestException(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.",
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role || Role.user,
        profile: { create: {} },
      },
      include: {
        profile: true,
      },
    });

    return {
      message: "User registered successfully",
      data: this.formatUserResponse(user),
    };
  }

  async validateGoogleUser(googleUserDetails: GoogleUserDetails) {
    let user = await this.prisma.user.findFirst({
      where: { email: googleUserDetails.email },
      include: {
        profile: true,
      },
    });

    // If user not found, create new Google user
    if (!user) {
      const username = `google_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      user = await this.prisma.user.create({
        data: {
          username,
          email: googleUserDetails.email,
          password: null,
          role: Role.user,
          status: UserStatus.pending,
          profile: {
            create: {
              profileImageUrl: null,
            },
          },
        },
        include: {
          profile: true,
        },
      });
    }

    if (user.status === UserStatus.pending) {
      throw new UnauthorizedException(
        "Your account is pending approval by an administrator.",
      );
    }

    if (user.status === UserStatus.rejected) {
      throw new UnauthorizedException(
        "Your account has been rejected or suspended.",
      );
    }

    return this.generateAuthResponse(user, "Google login successful");
  }

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      profileImageUrl: user.profile?.profileImageUrl ?? null,
    };
  }

  private async generateAuthResponse(user: any, message: string) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      message,
      data: {
        access_token: accessToken,
        user: this.formatUserResponse(user),
      },
    };
  }

  async login(data: LoginCredentialDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: data.username },
      include: {
        profile: true,
      },
    });

    if (!user) throw new UnauthorizedException("Invalid credentials");

    if (!user.password) {
      throw new UnauthorizedException("Please login with Google");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException("Invalid credentials");

    if (user.status === UserStatus.pending) {
      throw new UnauthorizedException(
        "Your account is pending approval by an administrator.",
      );
    }

    if (user.status === UserStatus.rejected) {
      throw new UnauthorizedException(
        "Your account has been rejected or suspended.",
      );
    }

    return this.generateAuthResponse(user, "Login successful");
  }

  async loginWithToken(token: string) {
    if (!token) throw new UnauthorizedException("No token provided");

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: true,
        },
      });

      if (!user) throw new UnauthorizedException("User not found");

      if (user.status === UserStatus.pending) {
        throw new UnauthorizedException(
          "Your account is pending approval by an administrator.",
        );
      }

      if (user.status === UserStatus.rejected) {
        throw new UnauthorizedException(
          "Your account has been rejected or suspended.",
        );
      }

      return this.generateAuthResponse(user, "Token login successful");
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });
    if (!user) throw new UnauthorizedException("User not found");

    return {
      message: "Profile retrieved successfully",
      data: this.formatUserResponse(user),
    };
  }
}
