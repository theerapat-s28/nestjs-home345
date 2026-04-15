import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class QueryTransactionDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ example: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  offset?: number = 0;
}
