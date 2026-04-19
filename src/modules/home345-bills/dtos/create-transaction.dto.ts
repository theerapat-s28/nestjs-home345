import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateTransactionDto {
  @ApiProperty({ example: "Shared Fund" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: "Monthly contribution pool" })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  note?: string;
}
