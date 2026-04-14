import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class QueryItemDto {
  @ApiPropertyOptional({
    example: "search term",
    description: "Filter by title (case-insensitive contains)",
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 10, description: "Page size (default: 10)" })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 0,
    description: "Number of records to skip (default: 0)",
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;
}
