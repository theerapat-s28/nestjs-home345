import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginCredentialDto {
  @ApiProperty({ example: "john_doe" })
  @IsString()
  username: string;

  @ApiProperty({ example: "StrongPassword123" })
  @IsString()
  password: string;
}
