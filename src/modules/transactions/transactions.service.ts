import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CashTxnType, PortfolioRole, TransactionType } from '@prisma/client';
import { PortfoliosService } from '@modules/portfolios/portfolios.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { QueryTransactionDto } from './dtos/query-transaction.dto';

// ── Select shapes ─────────────────────────────────────────────────────────────

const txnSelect = {
  id: true,
  type: true,
  quantity: true,
  pricePerUnit: true,
  currency: true,
  fee: true,
  note: true,
  executedAt: true,
  createdAt: true,
  portfolioAsset: {
    select: {
      id: true,
      asset: { select: { id: true, symbol: true, name: true, type: true } },
    },
  },
  cashTransaction: { select: { id: true, type: true, amount: true, currency: true } },
};

// ── Cash side-effect mapping ──────────────────────────────────────────────────
const cashTxnTypeMap: Partial<Record<TransactionType, CashTxnType>> = {
  [TransactionType.BUY]: CashTxnType.BUY_DEBIT,
  [TransactionType.SELL]: CashTxnType.SELL_CREDIT,
  [TransactionType.DIVIDEND]: CashTxnType.DIVIDEND,
  [TransactionType.FEE]: CashTxnType.FEE,
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  async create(portfolioId: string, userId: string, dto: CreateTransactionDto) {
    // 1. Access check — minimum EDITOR role to record a transaction
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.EDITOR);

    // 2. Verify asset exists
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, deletedAt: null },
      select: { id: true, symbol: true },
    });
    if (!asset) throw new NotFoundException(`Asset ${dto.assetId} not found`);

    const qty = dto.quantity;
    const price = dto.pricePerUnit;
    const fee = dto.fee ?? 0;
    const totalValue = qty * price;

    // 3. Execute everything in a single DB transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 3a. Upsert PortfolioAsset (holding record)
      const existingHolding = await tx.portfolioAsset.findUnique({
        where: { portfolioId_assetId: { portfolioId, assetId: dto.assetId } },
        select: { id: true, quantity: true, avgCost: true },
      });

      let holdingId: string;
      let newQty: number;
      let newAvgCost: number;

      if (!existingHolding) {
        if (dto.type === TransactionType.SELL || dto.type === TransactionType.TRANSFER_OUT) {
          throw new BadRequestException('Cannot sell or transfer out an asset you do not hold');
        }
        const holding = await tx.portfolioAsset.create({
          data: { portfolioId, assetId: dto.assetId, quantity: qty, avgCost: price },
          select: { id: true },
        });
        holdingId = holding.id;
        newQty = qty;
        newAvgCost = price;
      } else {
        holdingId = existingHolding.id;
        const currentQty = Number(existingHolding.quantity);
        const currentAvgCost = Number(existingHolding.avgCost);

        if (dto.type === TransactionType.BUY || dto.type === TransactionType.TRANSFER_IN) {
          // Weighted average cost recalculation
          const totalCost = currentQty * currentAvgCost + totalValue;
          newQty = currentQty + qty;
          newAvgCost = newQty === 0 ? price : totalCost / newQty;
        } else if (dto.type === TransactionType.SELL || dto.type === TransactionType.TRANSFER_OUT) {
          if (currentQty < qty) {
            throw new BadRequestException(
              `Insufficient quantity: have ${currentQty}, selling ${qty}`,
            );
          }
          newQty = currentQty - qty;
          newAvgCost = currentAvgCost; // avgCost unchanged on SELL (average cost method)
        } else if (dto.type === TransactionType.SPLIT) {
          // qty = new total quantity after the split
          newQty = qty;
          newAvgCost = currentQty === 0 ? currentAvgCost : (currentAvgCost * currentQty) / qty;
        } else {
          // DIVIDEND, FEE — no quantity change on the holding
          newQty = currentQty;
          newAvgCost = currentAvgCost;
        }

        await tx.portfolioAsset.update({
          where: { id: holdingId },
          data: {
            quantity: newQty,
            avgCost: newAvgCost,
            lastRecalculatedAt: new Date(),
            isRecalculating: false,
          },
        });
      }

      // 3b. Create the Transaction record
      const txn = await tx.transaction.create({
        data: {
          portfolioAssetId: holdingId,
          type: dto.type,
          quantity: qty,
          pricePerUnit: price,
          currency: dto.currency,
          fee: fee === 0 ? null : fee,
          note: dto.note,
          executedAt: new Date(dto.executedAt),
        },
        select: txnSelect,
      });

      // 3c. Cash side-effect for BUY / SELL / DIVIDEND / FEE
      const cashType = cashTxnTypeMap[dto.type];
      if (cashType) {
        let cashAmount: number;
        if (dto.type === TransactionType.BUY) {
          cashAmount = -(totalValue + fee); // negative = outflow
        } else if (dto.type === TransactionType.SELL) {
          cashAmount = totalValue - fee; // positive = inflow
        } else if (dto.type === TransactionType.DIVIDEND) {
          cashAmount = totalValue; // pricePerUnit used as dividend amount per unit
        } else {
          // FEE
          cashAmount = -fee;
        }

        await tx.cashTransaction.create({
          data: {
            portfolioId,
            currency: dto.currency,
            type: cashType,
            amount: cashAmount,
            relatedTxnId: txn.id,
            executedAt: new Date(dto.executedAt),
          },
          select: { id: true },
        });

        // Update PortfolioCash balance
        await tx.portfolioCash.upsert({
          where: { portfolioId_currency: { portfolioId, currency: dto.currency } },
          create: { portfolioId, currency: dto.currency, balance: cashAmount },
          update: { balance: { increment: cashAmount } },
        });

        // Re-fetch with cash transaction populated
        return tx.transaction.findUnique({
          where: { id: txn.id },
          select: txnSelect,
        });
      }

      return txn;
    });

    return { message: 'Transaction recorded successfully', data: result };
  }

  async findAll(portfolioId: string, userId: string, query: QueryTransactionDto) {
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);

    const { type, limit = 20, offset = 0 } = query;
    const where: any = {
      portfolioAsset: { portfolioId },
      ...(type ? { type } : {}),
    };

    const [txns, totalRecords] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        select: txnSelect,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data: txns, meta: { totalRecords, limit, offset } };
  }

  async findOne(portfolioId: string, userId: string, txnId: string) {
    await this.portfoliosService.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);

    const txn = await this.prisma.transaction.findFirst({
      where: { id: txnId, portfolioAsset: { portfolioId } },
      select: txnSelect,
    });
    if (!txn) throw new NotFoundException(`Transaction ${txnId} not found`);
    return txn;
  }
}
