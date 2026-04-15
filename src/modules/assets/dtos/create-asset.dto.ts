import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @ApiProperty({ example: 'BTC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol: string;

  @ApiProperty({ example: 'Bitcoin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: AssetType, example: AssetType.CRYPTO })
  @IsEnum(AssetType)
  type: AssetType;
}
