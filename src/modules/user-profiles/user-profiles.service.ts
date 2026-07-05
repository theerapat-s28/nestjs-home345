import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateProfileDto } from "./dtos/create-profile.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";

@Injectable()
export class UserProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfileDto) {
    const { userId, ...profileData } = dto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: profileData,
            update: profileData,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _, ...profileData } = dto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          upsert: {
            create: profileData as any,
            update: profileData,
          },
        },
      },
      include: { profile: true },
    });

    return user.profile;
  }
}
