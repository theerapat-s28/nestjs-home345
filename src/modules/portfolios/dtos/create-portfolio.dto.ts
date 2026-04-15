import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreatePortfolioDto {
  @ApiProperty({ example: 'My Investment Portfolio' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Long-term growth strategy' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.THB })
  @IsEnum(Currency)
  @IsOptional()
  baseCurrency?: Currency = Currency.THB;
}
