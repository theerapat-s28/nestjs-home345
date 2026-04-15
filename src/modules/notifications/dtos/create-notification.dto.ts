import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsJSON,
} from "class-validator";
import { NotificationType } from "@prisma/client";

export class CreateNotificationDto {
  @ApiProperty({ example: "New Task Assigned" })
  @IsString()
  title: string;

  @ApiProperty({
    example: "You have been assigned to a new task in Project X.",
  })
  @IsString()
  message: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.INFO,
    description:
      "info: news/announcements | task: task assignments | event: event assignments | approval: approval requests | client_external: external client notifications | system: system-generated",
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ example: { link: "/projects/123" } })
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ example: "uuid-of-sender" })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @ApiProperty({ example: ["uuid-of-recipient-1", "uuid-of-recipient-2"] })
  @IsArray()
  @IsUUID("4", { each: true })
  recipientIds: string[];
}
