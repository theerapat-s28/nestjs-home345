import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterCredentialDto } from "./dtos/register-credentail.dto";
import { LoginCredentialDto } from "./dtos/login-credential.dto";
import { Public } from "./decorators/public.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { Role } from "@prisma/client";
import { AuthResponseDto } from "./dtos/auth-response.dto";

import { Response } from "express";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterCredentialDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User successfully logged in",
    type: AuthResponseDto,
  })
  login(@Body() loginDto: LoginCredentialDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Initiates the Google OAuth flow
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    try {
      const authResult = await this.authService.validateGoogleUser(req.user);

      // Set state to check if the request came from Swagger UI
      const isSwaggerRequest = req.query.state === "swagger";

      if (isSwaggerRequest) {
        // Swagger UI Login Flow
        // Set cookie for the exact same domain where Swagger runs
        res.cookie("access_token", authResult.data.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        // Redirect back to Swagger UI
        res.redirect("/api/docs");
        return;
      }

      // Standard App Login Flow
      // Parse the domain from the frontend URL, because express cookie expects a hostname, not a full URL
      const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "";
      let cookieDomain: string | undefined;
      try {
        cookieDomain = new URL(frontendUrl).hostname;
        // if localhost, it's better to avoid setting the domain explicitly to prevent cross-port issues
        if (cookieDomain === "localhost") cookieDomain = undefined;
      } catch {
        cookieDomain = undefined;
      }

      // Set the access token in an HttpOnly cookie, cookie set
      // under the same domain as the backend.
      res.cookie("access_token", authResult.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Allow cross-site cookie
        domain: cookieDomain,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      // Redirect to frontend callback page
      res.redirect(
        `${this.configService.get<string>("FRONTEND_URL")}/auth/google/callback`,
      );
      return;
    } catch (error) {
      if (error.status === HttpStatus.UNAUTHORIZED) {
        // Redirect to frontend with an error parameter
        res.redirect(
          `${this.configService.get<string>("FRONTEND_URL")}/auth/google/callback?error=pending_approval`,
        );
        return;
      }
      // Re-throw if it is an unexpected error
      throw error;
    }
  }

  /**
   * This endpoint is called by the frontend after a successful Google OAuth redirect.
   * Since the access token is stored in an HttpOnly cookie, the frontend cannot read it directly.
   * Calling this endpoint allows the frontend to validate the token and retrieve
   * the authenticated user's details and menus to complete the login flow.
   */
  @Public()
  @Get("verify-token")
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Token successfully verified",
    type: AuthResponseDto,
  })
  verifyToken(@Request() req: any) {
    const token = req.cookies?.["access_token"];
    return this.authService.loginWithToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @HttpCode(HttpStatus.OK)
  profile(@Request() req: any) {
    return this.authService.profile(req.user.id);
  }

  // Example of role-protected route
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @Get("admin-only")
  @HttpCode(HttpStatus.OK)
  adminOnly() {
    return { message: "Welcome, admin!", data: null };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const isSwaggerRequest = req.headers.referer?.includes("/api/docs");

    if (isSwaggerRequest) {
      res.clearCookie("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    } else {
      const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "";
      let cookieDomain: string | undefined;
      try {
        cookieDomain = new URL(frontendUrl).hostname;
        if (cookieDomain === "localhost") cookieDomain = undefined;
      } catch {
        cookieDomain = undefined;
      }

      res.clearCookie("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        domain: cookieDomain,
      });
    }

    return { message: "Successfully logged out" };
  }
}
