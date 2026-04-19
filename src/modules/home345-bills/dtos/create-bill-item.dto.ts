import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { BillCategory } from "@prisma/client";

export class CreateBillItemDto {
  @ApiProperty({ enum: BillCategory, example: BillCategory.ELECTRIC })
  @IsEnum(BillCategory)
  category: BillCategory;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: "2026-04-15" })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: "Units 250 kWh" })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  note?: string;
}
