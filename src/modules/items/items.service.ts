import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { handlePrismaError } from "@common/helpers/prisma-error";
import { CreateItemDto } from "./dtos/create-item.dto";
import { UpdateItemDto } from "./dtos/update-item.dto";
import { QueryItemDto } from "./dtos/query-item.dto";
import { Role } from "@prisma/client";

/**
 * ItemsService — Example personal project feature service.
 *
 * Demonstrates the standard CRUD pattern used throughout this codebase:
 *   - Prisma for DB access via PrismaService
 *   - Soft-deletes via `deletedAt`
 *   - Ownership checks (users can only modify their own items; admins bypass)
 *   - Pagination shape expected by ResponseInterceptor: { data, meta }
 *   - Centralised Prisma error handling via handlePrismaError()
 *
 * Add your own feature services in the same style.
 *
 * IMPORTANT: Before using this service, add the `Item` model to
 * prisma/schema.prisma (the commented-out example at the bottom of the
 * schema) and run `pnpm migrate:dev`.
 */
@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateItemDto) {
    try {
      const item = await (this.prisma as any).item.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          userId,
        },
      });

      return { message: "Item created successfully", data: item };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  // ─── Read (paginated list) ────────────────────────────────────────────────

  async findAll(userId: string, role: Role, query: QueryItemDto) {
    const { search, limit, offset } = query;

    // Admins see all items; regular users only see their own
    const ownerFilter = role === Role.ADMIN ? {} : { userId };

    const where: any = {
      ...ownerFilter,
      deletedAt: null,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, totalRecords] = await Promise.all([
      (this.prisma as any).item.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      (this.prisma as any).item.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        totalRecords,
        limit,
        offset,
      },
    };
  }

  // ─── Read (single) ────────────────────────────────────────────────────────

  async findOne(id: string, userId: string, role: Role) {
    const item = await (this.prisma as any).item.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) throw new NotFoundException("Item not found");

    // Regular users may only read their own items
    if (role !== Role.ADMIN && item.userId !== userId) {
      throw new ForbiddenException("You do not have access to this item");
    }

    return { data: item };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(id: string, userId: string, role: Role, dto: UpdateItemDto) {
    const item = await (this.prisma as any).item.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) throw new NotFoundException("Item not found");

    if (role !== Role.ADMIN && item.userId !== userId) {
      throw new ForbiddenException("You do not have access to this item");
    }

    try {
      const updated = await (this.prisma as any).item.update({
        where: { id },
        data: dto,
      });
      return { message: "Item updated successfully", data: updated };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  // ─── Soft-delete ─────────────────────────────────────────────────────────

  async remove(id: string, userId: string, role: Role) {
    const item = await (this.prisma as any).item.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) throw new NotFoundException("Item not found");

    if (role !== Role.ADMIN && item.userId !== userId) {
      throw new ForbiddenException("You do not have access to this item");
    }

    try {
      await (this.prisma as any).item.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { message: "Item deleted successfully", data: null };
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
