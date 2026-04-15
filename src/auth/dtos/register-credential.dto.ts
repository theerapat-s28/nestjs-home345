import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsEnum,
} from "class-validator";
import { Role } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterCredentialDto {
  @ApiProperty({ example: "john_doe" })
  @IsString()
  username: string;

  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "StrongPassword123" })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: "b12c34de-7890-fg12-hi34-jklmno56789",
    required: false,
  })
  @IsOptional()
  @IsString()
  positionId?: string;
}
