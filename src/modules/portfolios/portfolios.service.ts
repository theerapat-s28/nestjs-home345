import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { MemberStatus, PortfolioRole } from '@prisma/client';
import { CreatePortfolioDto } from './dtos/create-portfolio.dto';
import { UpdatePortfolioDto } from './dtos/update-portfolio.dto';
import { InviteMemberDto } from './dtos/invite-member.dto';
import { UpdateMemberRoleDto } from './dtos/update-member-role.dto';

// ── Select shapes ────────────────────────────────────────────────────────────

const portfolioSelect = {
  id: true,
  name: true,
  description: true,
  baseCurrency: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const memberSelect = {
  id: true,
  role: true,
  status: true,
  createdAt: true,
  user: {
    select: { id: true, username: true, email: true },
  },
};

const holdingSelect = {
  id: true,
  quantity: true,
  avgCost: true,
  lastRecalculatedAt: true,
  createdAt: true,
  updatedAt: true,
  asset: {
    select: { id: true, symbol: true, name: true, type: true },
  },
};

// ── Role hierarchy for access checks ─────────────────────────────────────────
const roleRank: Record<PortfolioRole, number> = {
  [PortfolioRole.OWNER]: 3,
  [PortfolioRole.EDITOR]: 2,
  [PortfolioRole.VIEWER]: 1,
};

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Portfolio CRUD ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreatePortfolioDto) {
    const portfolio = await this.prisma.$transaction(async (tx) => {
      const p = await tx.portfolio.create({
        data: { ...dto },
        select: portfolioSelect,
      });
      await tx.portfolioMember.create({
        data: { portfolioId: p.id, userId, role: PortfolioRole.OWNER, status: MemberStatus.ACTIVE },
      });
      return p;
    });
    return { message: 'Portfolio created successfully', data: portfolio };
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.portfolioMember.findMany({
      where: { userId },
      select: {
        role: true,
        status: true,
        portfolio: {
          select: {
            ...portfolioSelect,
            _count: { select: { members: true, assets: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = memberships
      .filter((m) => m.portfolio.isActive)
      .map((m) => ({ ...m.portfolio, myRole: m.role, myStatus: m.status }));

    return { data, meta: { totalRecords: data.length, limit: data.length, offset: 0 } };
  }

  async findOne(portfolioId: string, userId: string) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, isActive: true, deletedAt: null },
      select: {
        ...portfolioSelect,
        members: { select: memberSelect },
        _count: { select: { assets: true, cashAccounts: true } },
      },
    });
    if (!portfolio) throw new NotFoundException(`Portfolio ${portfolioId} not found`);
    return portfolio;
  }

  async update(portfolioId: string, userId: string, dto: UpdatePortfolioDto) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.EDITOR);
    const updated = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: dto,
      select: portfolioSelect,
    });
    return { message: 'Portfolio updated successfully', data: updated };
  }

  async remove(portfolioId: string, userId: string) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.OWNER);
    await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Portfolio deleted successfully', data: null };
  }

  // ── Member management ─────────────────────────────────────────────────────

  async inviteMember(portfolioId: string, userId: string, dto: InviteMemberDto) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.OWNER);

    // Verify target user exists
    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
      select: { id: true, username: true, email: true },
    });
    if (!targetUser) throw new NotFoundException(`User ${dto.userId} not found`);

    const member = await this.prisma.portfolioMember.upsert({
      where: { userId_portfolioId: { userId: dto.userId, portfolioId } },
      create: { portfolioId, userId: dto.userId, role: dto.role, status: MemberStatus.PENDING },
      update: { role: dto.role, status: MemberStatus.PENDING }, // Reset to pending if re-invited
      select: memberSelect,
    });
    return { message: 'Member added successfully', data: member };
  }

  async updateMemberRole(portfolioId: string, userId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.OWNER);
    if (userId === targetUserId) throw new ForbiddenException('Cannot change your own role');

    const member = await this.prisma.portfolioMember.update({
      where: { userId_portfolioId: { userId: targetUserId, portfolioId } },
      data: { role: dto.role },
      select: memberSelect,
    });
    return { message: 'Member role updated', data: member };
  }

  async removeMember(portfolioId: string, userId: string, targetUserId: string) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.OWNER);
    if (userId === targetUserId) throw new ForbiddenException('Cannot remove yourself — transfer ownership first');

    await this.prisma.portfolioMember.delete({
      where: { userId_portfolioId: { userId: targetUserId, portfolioId } },
    });
    return { message: 'Member removed', data: null };
  }

  async acceptInvitation(portfolioId: string, userId: string) {
    const member = await this.prisma.portfolioMember.findUnique({
      where: { userId_portfolioId: { userId, portfolioId } },
    });

    if (!member) throw new NotFoundException('Invitation not found');
    if (member.status !== MemberStatus.PENDING) {
      return { message: `Member is already ${member.status.toLowerCase()}`, data: null };
    }

    const updated = await this.prisma.portfolioMember.update({
      where: { userId_portfolioId: { userId, portfolioId } },
      data: { status: MemberStatus.ACTIVE },
      select: memberSelect,
    });

    return { message: 'Invitation accepted', data: updated };
  }

  async rejectInvitation(portfolioId: string, userId: string) {
    const member = await this.prisma.portfolioMember.findUnique({
      where: { userId_portfolioId: { userId, portfolioId } },
    });

    if (!member) throw new NotFoundException('Invitation not found');
    
    // We can either delete the record or mark as REVOKED. 
    // Usually for "reject" we might just delete to allow future re-invites without record bloat, 
    // or keep as REVOKED for history. Let's delete for "reject".
    await this.prisma.portfolioMember.delete({
      where: { userId_portfolioId: { userId, portfolioId } },
    });

    return { message: 'Invitation rejected', data: null };
  }

  // ── Holdings view ─────────────────────────────────────────────────────────

  async getHoldings(portfolioId: string, userId: string) {
    await this.assertAccess(portfolioId, userId, PortfolioRole.VIEWER);

    const holdings = await this.prisma.portfolioAsset.findMany({
      where: { portfolioId, deletedAt: null },
      select: holdingSelect,
      orderBy: { createdAt: 'asc' },
    });
    return { data: holdings, meta: { totalRecords: holdings.length, limit: holdings.length, offset: 0 } };
  }

  // ── Shared access helper (exported for use by other services) ─────────────

  async assertAccess(portfolioId: string, userId: string, minRole: PortfolioRole): Promise<void> {
    const member = await this.prisma.portfolioMember.findUnique({
      where: { userId_portfolioId: { userId, portfolioId } },
      select: { role: true, status: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this portfolio');
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException(`Your membership is currently ${member.status.toLowerCase()}`);
    }
    if (roleRank[member.role] < roleRank[minRole]) {
      throw new ForbiddenException(`Required role: ${minRole}, your role: ${member.role}`);
    }
  }
}
