import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsUUID,
} from "class-validator";
import { BillingCycle, Currency } from "@prisma/client";

export class CreateSubscriptionDto {
  @ApiProperty({ example: "Netflix" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Standard plan", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 15.99 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  @IsNotEmpty()
  billingCycle: BillingCycle;

  @ApiProperty({ example: "2026-05-01T00:00:00Z" })
  @IsDateString()
  @IsNotEmpty()
  nextBillingDate: string;

  @ApiProperty({
    example: "b12c34de-7890-fg12-hi34-jklmno56789",
    required: false,
  })
  @IsUUID()
  @IsOptional()
  paymentMethodId?: string;
}
