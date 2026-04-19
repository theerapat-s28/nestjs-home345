import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { Home345AccessGuard } from "@auth/guards/home345-access.guard";
import { Home345BillsService } from "./home345-bills.service";
import { CreateBillDto } from "./dtos/create-bill.dto";
import { UpdateBillDto } from "./dtos/update-bill.dto";
import { CreateBillItemDto } from "./dtos/create-bill-item.dto";
import { UpdateBillItemDto } from "./dtos/update-bill-item.dto";
import { CreateTransactionDto } from "./dtos/create-transaction.dto";
import { UpdateTransactionDto } from "./dtos/update-transaction.dto";
import { QueryBillDto } from "./dtos/query-bill.dto";
import { QueryTransactionDto } from "./dtos/query-transaction.dto";

@ApiTags("Home345 Bills")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, Home345AccessGuard)
@Controller()
export class Home345BillsController {
  constructor(private readonly service: Home345BillsService) {}

  // ─── Bills ────────────────────────────────────────────────────────────────

  @Post("home345-bills")
  @ApiOperation({ summary: "Create a bill" })
  createBill(@Body() dto: CreateBillDto) {
    return this.service.createBill(dto);
  }

  @Get("home345-bills")
  @ApiOperation({ summary: "List all bills with items" })
  findAllBills(@Query() query: QueryBillDto) {
    return this.service.findAllBills(query);
  }

  @Get("home345-bills/:id")
  @ApiOperation({ summary: "Get a bill by ID" })
  findOneBill(@Param("id") id: string) {
    return this.service.findOneBill(id);
  }

  @Patch("home345-bills/:id")
  @ApiOperation({ summary: "Update a bill" })
  updateBill(@Param("id") id: string, @Body() dto: UpdateBillDto) {
    return this.service.updateBill(id, dto);
  }

  @Patch("home345-bills/:id/complete")
  @ApiOperation({ summary: "Mark bill as completed" })
  completeBill(@Param("id") id: string) {
    return this.service.completeBill(id);
  }

  @Delete("home345-bills/:id")
  @ApiOperation({ summary: "Delete a bill and its items" })
  removeBill(@Param("id") id: string) {
    return this.service.removeBill(id);
  }

  // ─── Bill Items ───────────────────────────────────────────────────────────

  @Post("home345-bills/:billId/items")
  @ApiOperation({ summary: "Add an item to a bill" })
  createBillItem(
    @Param("billId") billId: string,
    @Body() dto: CreateBillItemDto,
  ) {
    return this.service.createBillItem(billId, dto);
  }

  @Patch("home345-bills/:billId/items/:itemId")
  @ApiOperation({ summary: "Update a bill item" })
  updateBillItem(
    @Param("billId") billId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateBillItemDto,
  ) {
    return this.service.updateBillItem(billId, itemId, dto);
  }

  @Patch("home345-bills/:billId/items/:itemId/pay")
  @ApiOperation({ summary: "Mark a bill item as paid" })
  payBillItem(
    @Param("billId") billId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.service.payBillItem(billId, itemId);
  }

  @Delete("home345-bills/:billId/items/:itemId")
  @ApiOperation({ summary: "Remove an item from a bill" })
  removeBillItem(
    @Param("billId") billId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.service.removeBillItem(billId, itemId);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  @Post("home345-transactions")
  @ApiOperation({ summary: "Create a transaction" })
  createTransaction(@Body() dto: CreateTransactionDto) {
    return this.service.createTransaction(dto);
  }

  @Get("home345-transactions")
  @ApiOperation({ summary: "List all transactions" })
  findAllTransactions(@Query() query: QueryTransactionDto) {
    return this.service.findAllTransactions(query);
  }

  @Get("home345-transactions/:id")
  @ApiOperation({ summary: "Get a transaction by ID" })
  findOneTransaction(@Param("id") id: string) {
    return this.service.findOneTransaction(id);
  }

  @Patch("home345-transactions/:id")
  @ApiOperation({ summary: "Update a transaction" })
  updateTransaction(@Param("id") id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.updateTransaction(id, dto);
  }

  @Delete("home345-transactions/:id")
  @ApiOperation({ summary: "Delete a transaction" })
  removeTransaction(@Param("id") id: string) {
    return this.service.removeTransaction(id);
  }
}
