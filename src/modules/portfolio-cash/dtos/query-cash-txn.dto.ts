import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency, CashTxnType } from '@prisma/client';

export class QueryCashTxnDto {
  @ApiPropertyOptional({ enum: CashTxnType })
  @IsEnum(CashTxnType)
  @IsOptional()
  type?: CashTxnType;

  @ApiPropertyOptional({ enum: Currency })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  offset?: number = 0;
}
