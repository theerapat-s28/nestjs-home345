import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { SearchUserDto } from "./dtos/seach-user.dto";
import { UserInterfaceResponse } from "./interfaces/user-response.interface";
import { PaginatedResponse } from "./interfaces/paginated-user-response";
import { Role } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Private helpers ─────────────────────────────────────────────────────
  private readonly defaultInclude = {
    profile: true,
  };

  private async findOrThrow(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        role: Role.user,
      },
      include: this.defaultInclude,
    });

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    return user;
  }

  // ── Public CRUD ──────────────────────────────────────────────────────────
  async create(dto: CreateUserDto): Promise<UserInterfaceResponse> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        profile: { create: {} },
      },
      include: this.defaultInclude,
    });

    return user as any;
  }

  async findAll(): Promise<UserInterfaceResponse[]> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: this.defaultInclude,
      orderBy: { createdAt: "desc" },
    });

    return users as UserInterfaceResponse[];
  }

  async findById(id: string): Promise<UserInterfaceResponse> {
    return this.findOrThrow(id) as Promise<UserInterfaceResponse>;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserInterfaceResponse> {
    await this.findOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
      },
      include: this.defaultInclude,
    });

    return user as any;
  }

  async remove(id: string): Promise<UserInterfaceResponse> {
    await this.findOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: this.defaultInclude,
    });

    return user as UserInterfaceResponse;
  }

  async search(
    dto: SearchUserDto,
  ): Promise<PaginatedResponse<UserInterfaceResponse>> {
    const {
      page = 1,
      limit = 10,
      email,
      createdDate,
      isActive,
      role,
      status,
    } = dto;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      role: Role.user,
    };

    if (email) {
      where.email = { contains: email, mode: "insensitive" };
    }

    if (createdDate) {
      const start = new Date(createdDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(createdDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [totalRecords, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: this.defaultInclude,
      }),
    ]);

    return {
      data: users as UserInterfaceResponse[],
      meta: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  }
}
