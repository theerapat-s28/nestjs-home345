import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: false, description: "Grant or revoke Home345 module access" })
  @IsBoolean()
  @IsOptional()
  hasHome345Access?: boolean;
}
