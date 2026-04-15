import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { PortfolioRole } from '@prisma/client';
import { PortfoliosService } from '@modules/portfolios/portfolios.service';
import { CashOperationDto } from './dtos/cash-operation.dto';
import { QueryCashTxnDto } from './dtos/query-cash-txn.dto';

// ── Select shapes ─────────────────────────────────────────────────────────────

const cashTxnSelect = {
  id: true,
  currency: true,
  type: true,
  amount: true,
  note: true,
  executedAt: true,
  createdAt: true,
  relatedTxn: { select: { id: true, type: true } },
};

const cashBalanceSelect = {
  id: true,
  currency: true,
  balance: true,
  updatedAt: true,
};

@Injectable()
export class PortfolioCashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  // ── Cash balances ─────────────────────────────────────────────────────────

  async getBalances(portfolioId: string, userId: string) {
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);

    const balances = await this.prisma.portfolioCash.findMany({
      where: { portfolioId },
      select: cashBalanceSelect,
      orderBy: { currency: 'asc' },
    });
    return { data: balances, meta: { totalRecords: balances.length, limit: balances.length, offset: 0 } };
  }

  // ── Cash operations (deposit / withdrawal / manual) ───────────────────────

  async recordOperation(portfolioId: string, userId: string, dto: CashOperationDto) {
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.EDITOR);

    const amount = dto.amount;

    const result = await this.prisma.$transaction(async (tx) => {
      // Create audit record
      const cashTxn = await tx.cashTransaction.create({
        data: {
          portfolioId,
          currency: dto.currency,
          type: dto.type,
          amount,
          note: dto.note,
          executedAt: new Date(dto.executedAt),
        },
        select: cashTxnSelect,
      });

      // Update balance
      await tx.portfolioCash.upsert({
        where: { portfolioId_currency: { portfolioId, currency: dto.currency } },
        create: { portfolioId, currency: dto.currency, balance: amount },
        update: { balance: { increment: amount } },
      });

      return cashTxn;
    });

    return { message: 'Cash operation recorded', data: result };
  }

  // ── Cash transaction history ──────────────────────────────────────────────

  async getCashTransactions(portfolioId: string, userId: string, query: QueryCashTxnDto) {
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);

    const { type, currency, limit = 20, offset = 0 } = query;
    const where: any = {
      portfolioId,
      ...(type ? { type } : {}),
      ...(currency ? { currency } : {}),
    };

    const [txns, totalRecords] = await this.prisma.$transaction([
      this.prisma.cashTransaction.findMany({
        where,
        select: cashTxnSelect,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.cashTransaction.count({ where }),
    ]);

    return { data: txns, meta: { totalRecords, limit, offset } };
  }
}
