import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateReminderDto } from "./dtos/create-reminder.dto";
import { UpdateReminderDto } from "./dtos/update-reminder.dto";

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateReminderDto) {
    // 1. Verify subscription existence and ownership
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: createDto.subscriptionId,
        userId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${createDto.subscriptionId} not found`,
      );
    }

    // 2. Create the reminder
    return this.prisma.reminder.create({
      data: createDto,
    });
  }

  async findAll(userId: string) {
    return this.prisma.reminder.findMany({
      where: {
        subscription: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  async findOne(userId: string, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: {
        id,
        subscription: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        subscription: true,
      },
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder ${id} not found`);
    }

    return reminder;
  }

  async update(userId: string, id: string, updateDto: UpdateReminderDto) {
    await this.findOne(userId, id);

    return this.prisma.reminder.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.reminder.delete({
      where: { id },
    });
  }
}
