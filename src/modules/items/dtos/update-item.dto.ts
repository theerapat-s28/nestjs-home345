import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateItemDto {
  @ApiPropertyOptional({
    example: "Updated Title",
    description: "New title for the item",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: "Updated description.",
    description: "New description for the item",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
