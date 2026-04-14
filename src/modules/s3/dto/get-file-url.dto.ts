import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class GetFileUrlDto {
  @ApiProperty({ description: "The S3 object key" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({ description: "The original filename for download" })
  @IsString()
  @IsOptional()
  fileName?: string;
}
