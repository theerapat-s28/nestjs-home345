import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateProfileDto } from "./dtos/create-profile.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";

@Injectable()
export class UserProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfileDto) {
    const { profileImageUrl, userId } = dto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: { profileImageUrl },
            update: { profileImageUrl },
          },
        },
      },
      include: { profile: true },
    });

    return user.profile;
  }

  async findProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    return profile;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { profileImageUrl } = dto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: { profileImageUrl },
            update: { profileImageUrl },
          },
        },
      },
      include: { profile: true },
    });

    return user.profile;
  }
}
