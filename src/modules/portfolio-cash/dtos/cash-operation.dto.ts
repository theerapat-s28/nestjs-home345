import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Currency, CashTxnType } from '@prisma/client';

export class CashOperationDto {
  @ApiProperty({ enum: CashTxnType, example: CashTxnType.DEPOSIT })
  @IsEnum(CashTxnType)
  type: CashTxnType;

  @ApiProperty({ example: 50000, description: 'Positive = money in, negative = money out' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: Currency, default: Currency.THB })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: 'Initial deposit' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ example: '2026-04-15T14:00:00.000Z' })
  @IsDateString()
  executedAt: string;
}
