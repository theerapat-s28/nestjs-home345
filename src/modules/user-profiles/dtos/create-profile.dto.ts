import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum } from "class-validator";
import { Theme } from "@prisma/client";

export class CreateProfileDto {
  @ApiProperty({ example: "uuid-of-user" })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "Software Engineer" })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: "profiles/uuid/avatar.jpg" })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional({ enum: Theme, default: Theme.ROOT })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;
}
