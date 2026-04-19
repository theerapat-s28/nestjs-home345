import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsDateString, Min } from "class-validator";

export class CreateBillDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  seq: number;

  @ApiProperty({ example: "April 2026" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "2026-04-01" })
  @IsDateString()
  @IsOptional()
  date?: string;
}
