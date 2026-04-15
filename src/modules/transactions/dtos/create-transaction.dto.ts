import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Currency, TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ example: 'asset-uuid-here' })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.BUY })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 0.5, description: 'Quantity of asset (use 1 for DIVIDEND, FEE)' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 3200000, description: 'Price per unit in chosen currency' })
  @IsNumber()
  @IsPositive()
  pricePerUnit: number;

  @ApiProperty({ enum: Currency, default: Currency.THB })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: 75, description: 'Trading fee (optional)' })
  @IsNumber()
  @IsOptional()
  fee?: number;

  @ApiPropertyOptional({ example: 'Bought on a dip' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ example: '2026-04-15T14:00:00.000Z' })
  @IsDateString()
  executedAt: string;
}
