import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CreateProfileDto {
  @ApiProperty({ example: "uuid-of-user" })
  @IsString()
  userId: string;

  @ApiProperty({ example: "profiles/uuid/avatar.jpg", required: false })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
