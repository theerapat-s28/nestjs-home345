import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateBillDto } from "./dtos/create-bill.dto";
import { UpdateBillDto } from "./dtos/update-bill.dto";
import { CreateBillItemDto } from "./dtos/create-bill-item.dto";
import { UpdateBillItemDto } from "./dtos/update-bill-item.dto";
import { CreateTransactionDto } from "./dtos/create-transaction.dto";
import { UpdateTransactionDto } from "./dtos/update-transaction.dto";
import { QueryBillDto } from "./dtos/query-bill.dto";
import { QueryTransactionDto } from "./dtos/query-transaction.dto";

@Injectable()
export class Home345BillsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Bills ────────────────────────────────────────────────────────────────

  async createBill(dto: CreateBillDto) {
    return this.prisma.home345Bill.create({ data: dto });
  }

  async findAllBills(query: QueryBillDto) {
    const { limit = 10, offset = 0, isCompleted } = query;
    const where = isCompleted !== undefined ? { isCompleted } : {};

    const [bills, totalRecords] = await Promise.all([
      this.prisma.home345Bill.findMany({
        where,
        include: { billItems: true },
        orderBy: [{ seq: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.home345Bill.count({ where }),
    ]);

    return { data: bills, meta: { totalRecords, limit, offset } };
  }

  async findOneBill(id: string) {
    const bill = await this.prisma.home345Bill.findUnique({
      where: { id },
      include: { billItems: true },
    });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }

  async updateBill(id: string, dto: UpdateBillDto) {
    await this.findOneBill(id);
    return this.prisma.home345Bill.update({ where: { id }, data: dto });
  }

  async removeBill(id: string) {
    await this.findOneBill(id);
    return this.prisma.home345Bill.delete({ where: { id } });
  }

  async completeBill(id: string) {
    await this.findOneBill(id);
    return this.prisma.home345Bill.update({
      where: { id },
      data: { isCompleted: true },
    });
  }

  // ─── Bill Items ───────────────────────────────────────────────────────────

  async createBillItem(billId: string, dto: CreateBillItemDto) {
    await this.findOneBill(billId);
    return this.prisma.home345BillItem.create({ data: { ...dto, billId } });
  }

  async updateBillItem(billId: string, itemId: string, dto: UpdateBillItemDto) {
    await this.findBillItem(billId, itemId);
    return this.prisma.home345BillItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async removeBillItem(billId: string, itemId: string) {
    await this.findBillItem(billId, itemId);
    return this.prisma.home345BillItem.delete({ where: { id: itemId } });
  }

  async payBillItem(billId: string, itemId: string) {
    await this.findBillItem(billId, itemId);
    return this.prisma.home345BillItem.update({
      where: { id: itemId },
      data: { isPaid: true },
    });
  }

  private async findBillItem(billId: string, itemId: string) {
    const item = await this.prisma.home345BillItem.findFirst({
      where: { id: itemId, billId },
    });
    if (!item) throw new NotFoundException(`Bill item ${itemId} not found`);
    return item;
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async createTransaction(dto: CreateTransactionDto) {
    return this.prisma.home345Transaction.create({ data: dto });
  }

  async findAllTransactions(query: QueryTransactionDto) {
    const { limit = 10, offset = 0 } = query;

    const [transactions, totalRecords] = await Promise.all([
      this.prisma.home345Transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.home345Transaction.count(),
    ]);

    return { data: transactions, meta: { totalRecords, limit, offset } };
  }

  async findOneTransaction(id: string) {
    const tx = await this.prisma.home345Transaction.findUnique({
      where: { id },
    });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return tx;
  }

  async updateTransaction(id: string, dto: UpdateTransactionDto) {
    await this.findOneTransaction(id);
    return this.prisma.home345Transaction.update({ where: { id }, data: dto });
  }

  async removeTransaction(id: string) {
    await this.findOneTransaction(id);
    return this.prisma.home345Transaction.delete({ where: { id } });
  }
}
