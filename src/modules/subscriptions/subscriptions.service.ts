import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateSubscriptionDto } from "./dtos/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dtos/update-subscription.dto";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createSubscriptionDto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        ...createSubscriptionDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.subscription.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        paymentMethod: true,
      },
      orderBy: {
        nextBillingDate: "asc",
      },
    });
  }

  async findOne(userId: string, id: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        paymentMethod: true,
        reminders: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  async update(
    userId: string,
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    // Ensure it belongs to user
    await this.findOne(userId, id);

    return this.prisma.subscription.update({
      where: { id },
      data: updateSubscriptionDto,
    });
  }

  async remove(userId: string, id: string) {
    // Ensure it belongs to user
    await this.findOne(userId, id);

    return this.prisma.subscription.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
