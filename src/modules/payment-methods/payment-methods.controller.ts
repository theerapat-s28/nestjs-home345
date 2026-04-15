import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentMethodsService } from "./payment-methods.service";
import { CreatePaymentMethodDto } from "./dtos/create-payment-method.dto";
import { UpdatePaymentMethodDto } from "./dtos/update-payment-method.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";

@ApiTags("Payment Methods")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("payment-methods")
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @ApiOperation({ summary: "Add a new payment method" })
  create(
    @GetUser("id") userId: string,
    @Body() createDto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all payment methods for the user" })
  findAll(@GetUser("id") userId: string) {
    return this.paymentMethodsService.findAll(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single payment method by ID" })
  findOne(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.paymentMethodsService.findOne(userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update payment method details" })
  update(
    @GetUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(userId, id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete a payment method" })
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.paymentMethodsService.remove(userId, id);
  }
}
