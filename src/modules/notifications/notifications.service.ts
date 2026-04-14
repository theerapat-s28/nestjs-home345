import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { WebsocketService } from "@core/websocket/websocket.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { QueryNotificationDto } from "./dtos/query-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsService: WebsocketService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const { recipientIds, ...rest } = dto;

    const notification = await this.prisma.notification.create({
      data: {
        ...rest,
        recipients: {
          create: recipientIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        recipients: true,
        sender: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });

    // Send real-time notification via WebSocket
    const senderPayload = notification.sender
      ? {
          id: notification.sender.id,
          username: notification.sender.username,
          profileImageUrl: notification.sender.profile?.profileImageUrl ?? null,
        }
      : null;

    recipientIds.forEach((userId) => {
      this.wsService.sendToUser(userId, "notification", {
        id: notification.id,
        senderId: notification.senderId,
        sender: senderPayload,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data,
        createdAt: notification.createdAt,
      });
    });

    return notification;
  }

  async findAllForUser(userId: string, query: QueryNotificationDto) {
    const { type, isRead, limit, offset } = query;

    const where: any = {
      userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.notification = {
        type,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.notificationRecipient.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          notification: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      profileImageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.notificationRecipient.count({ where }),
    ]);

    return { items, total };
  }

  async markAsRead(userId: string, id: string) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        userId,
        OR: [{ id }, { notificationId: id }],
      },
    });

    if (!recipient) {
      throw new NotFoundException("Notification not found for this user");
    }

    return this.prisma.notificationRecipient.update({
      where: {
        id: recipient.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notificationRecipient.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return { count };
  }

  async remove(userId: string, id: string) {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        userId,
        OR: [{ id }, { notificationId: id }],
      },
    });

    if (!recipient) {
      throw new NotFoundException("Notification not found for this user");
    }

    return this.prisma.notificationRecipient.delete({
      where: {
        id: recipient.id,
      },
    });
  }
}
