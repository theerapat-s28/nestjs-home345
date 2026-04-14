import { Controller, Get, Post, Patch, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UserProfilesService } from "./user-profiles.service";
import { CreateProfileDto } from "./dtos/create-profile.dto";
import { UpdateProfileDto } from "./dtos/update-profile.dto";

@ApiTags("user-profiles")
@Controller("user-profiles")
export class UserProfilesController {
  constructor(private readonly userProfilesService: UserProfilesService) {}

  @Get(":userId")
  @ApiOperation({ summary: "Get profile by user ID" })
  findProfile(@Param("userId") userId: string) {
    return this.userProfilesService.findProfile(userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new user profile" })
  create(@Body() dto: CreateProfileDto) {
    return this.userProfilesService.create(dto);
  }

  @Patch(":userId")
  @ApiOperation({ summary: "Update user profile" })
  update(@Param("userId") userId: string, @Body() dto: UpdateProfileDto) {
    return this.userProfilesService.update(userId, dto);
  }
}
