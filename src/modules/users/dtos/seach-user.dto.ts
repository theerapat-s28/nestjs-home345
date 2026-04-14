import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { Role, UserStatus } from "@prisma/client";

export class SearchUserDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiProperty({ example: "user@example.com", required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: "2026-03-23", required: false })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
