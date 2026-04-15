import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { PaymentType } from "@prisma/client";

export class CreatePaymentMethodDto {
  @ApiProperty({ enum: PaymentType, example: PaymentType.CREDIT_CARD })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @ApiProperty({ example: "VISA", required: false })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty({ example: "1234", required: false })
  @IsString()
  @IsOptional()
  last4?: string;

  @ApiProperty({ example: "My main card", required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
