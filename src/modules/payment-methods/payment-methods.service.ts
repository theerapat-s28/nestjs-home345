import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreatePaymentMethodDto } from "./dtos/create-payment-method.dto";
import { UpdatePaymentMethodDto } from "./dtos/update-payment-method.dto";

/** class-validator's `@IsDateString()` accepts date-only strings, but Prisma's `DateTime` scalar requires a full ISO-8601 datetime — convert here. */
function withParsedCardExpiry<T extends { cardExpiry?: string }>(
  dto: T,
): Omit<T, "cardExpiry"> & { cardExpiry?: Date } {
  return {
    ...dto,
    cardExpiry: dto.cardExpiry ? new Date(dto.cardExpiry) : undefined,
  };
}

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: {
        ...withParsedCardExpiry(createDto),
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: {
        userId,
        deletedAt: null,
      },
    });
  }

  async findOne(userId: string, id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      include: {
        subscriptions: true,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    return paymentMethod;
  }

  async update(userId: string, id: string, updateDto: UpdatePaymentMethodDto) {
    await this.findOne(userId, id);

    return this.prisma.paymentMethod.update({
      where: { id },
      data: withParsedCardExpiry(updateDto),
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.paymentMethod.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
