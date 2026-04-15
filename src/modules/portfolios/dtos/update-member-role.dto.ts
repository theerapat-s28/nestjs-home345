import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PortfolioRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: PortfolioRole })
  @IsEnum(PortfolioRole)
  @IsNotEmpty()
  role: PortfolioRole;
}
