import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { QueryNotificationDto } from "./dtos/query-notification.dto";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new notification (System/Admin)" })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get("my")
  @ApiOperation({ summary: "Get current user notifications" })
  findAll(@Request() req: any, @Query() query: QueryNotificationDto) {
    return this.notificationsService.findAllForUser(req.user.id, query);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get current user unread notification count" })
  countUnread(@Request() req: any) {
    return this.notificationsService.countUnread(req.user.id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a specific notification as read" })
  markAsRead(@Request() req: any, @Param("id") id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification for current user" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.notificationsService.remove(req.user.id, id);
  }
}
