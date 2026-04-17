import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { PortfolioRole } from '@prisma/client';

export class AddMemberByEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ enum: PortfolioRole, default: PortfolioRole.VIEWER })
  @IsEnum(PortfolioRole)
  role: PortfolioRole;
}
