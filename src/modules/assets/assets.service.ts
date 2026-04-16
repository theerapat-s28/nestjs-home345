import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAssetDto } from './dtos/create-asset.dto';
import { UpdateAssetDto } from './dtos/update-asset.dto';
import { QueryAssetDto } from './dtos/query-asset.dto';
import { CreateAssetPriceDto } from './dtos/create-asset-price.dto';

// ── Select shapes ─────────────────────────────────────────────────────────────

const priceSelect = {
  id: true,
  price: true,
  currency: true,
  source: true,
  recordedAt: true,
} satisfies Prisma.AssetPriceSelect;

const assetSelect = {
  id: true,
  symbol: true,
  name: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  prices: {
    take: 1,
    orderBy: { recordedAt: 'desc' as const },
    select: priceSelect,
  },
} satisfies Prisma.AssetSelect;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Asset CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateAssetDto) {
    const asset = await this.prisma.asset.create({
      data: dto,
      select: assetSelect,
    });
    return { message: 'Asset created successfully', data: asset };
  }

  async findAll(query: QueryAssetDto) {
    const { search, type, limit = 20, offset = 0 } = query;

    const where: any = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { symbol: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(type ? { type } : {}),
    };

    const [assets, totalRecords] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        select: assetSelect,
        orderBy: { symbol: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data: assets, meta: { totalRecords, limit, offset } };
  }

  async findOne(id: string) {
    return this.ensureExists(id);
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.asset.update({
      where: { id },
      data: dto,
      select: assetSelect,
    });
    return { message: 'Asset updated successfully', data: updated };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Asset deleted successfully', data: null };
  }

  // ── Price history ─────────────────────────────────────────────────────────

  async recordPrice(assetId: string, dto: CreateAssetPriceDto) {
    await this.ensureExists(assetId);
    const price = await this.prisma.assetPrice.create({
      data: { assetId, ...dto },
      select: priceSelect,
    });
    return { message: 'Price recorded successfully', data: price };
  }

  async getPriceHistory(assetId: string, limit = 50, offset = 0) {
    await this.ensureExists(assetId);
    const [prices, totalRecords] = await this.prisma.$transaction([
      this.prisma.assetPrice.findMany({
        where: { assetId },
        select: priceSelect,
        orderBy: { recordedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.assetPrice.count({ where: { assetId } }),
    ]);
    return { data: prices, meta: { totalRecords, limit, offset } };
  }

  async getLatestPrice(assetId: string) {
    const price = await this.prisma.assetPrice.findFirst({
      where: { assetId },
      select: priceSelect,
      orderBy: { recordedAt: 'desc' },
    });
    return price;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async ensureExists(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      select: assetSelect,
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

}
