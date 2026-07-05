import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateNoteDto {
  @ApiPropertyOptional({ example: "Shopping list" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: "Buy milk, eggs, bread" })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    example: "2026-06-01T00:00:00.000Z",
    description: "ISO 8601 datetime. If omitted the note never expires.",
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
