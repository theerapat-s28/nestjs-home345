import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateItemDto {
  @ApiProperty({
    example: "My First Item",
    description: "Title of the item (max 255 chars)",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: "A short description of this item.",
    description: "Optional description",
  })
  @IsString()
  @IsOptional()
  description?: string;
}
