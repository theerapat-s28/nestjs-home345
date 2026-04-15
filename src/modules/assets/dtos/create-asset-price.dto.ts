import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateAssetPriceDto {
  @ApiProperty({ example: 95000.5 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ enum: Currency, default: Currency.THB })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ example: 'binance' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}
