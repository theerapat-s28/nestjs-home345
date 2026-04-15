import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { AssetType } from '@prisma/client';

export class QueryAssetDto {
  @ApiPropertyOptional({ example: 'BTC' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AssetType })
  @IsEnum(AssetType)
  @IsOptional()
  type?: AssetType;

  @ApiPropertyOptional({ example: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  offset?: number = 0;
}
