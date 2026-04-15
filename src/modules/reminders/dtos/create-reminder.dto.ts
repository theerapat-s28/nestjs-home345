import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsEnum, IsUUID, Min } from "class-validator";
import { NotificationChannel } from "@prisma/client";

export class CreateReminderDto {
  @ApiProperty({
    example: "b12c34de-7890-fg12-hi34-jklmno56789",
  })
  @IsUUID()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  daysBefore: number;

  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.EMAIL,
  })
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel: NotificationChannel;
}
