import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeleteFileDto {
  @ApiProperty({ description: "The S3 object key to delete" })
  @IsString()
  @IsNotEmpty()
  key: string;
}
