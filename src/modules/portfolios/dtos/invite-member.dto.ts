import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PortfolioRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: PortfolioRole, default: PortfolioRole.VIEWER })
  @IsEnum(PortfolioRole)
  role: PortfolioRole;
}
