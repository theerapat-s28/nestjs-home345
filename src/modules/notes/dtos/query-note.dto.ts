import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class QueryNoteDto {
  @ApiPropertyOptional({
    example: "shopping",
    description: "Search in title and content",
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Set to true to include expired notes in the results",
  })
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  @IsOptional()
  includeExpired?: boolean = false;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  offset?: number = 0;
}
