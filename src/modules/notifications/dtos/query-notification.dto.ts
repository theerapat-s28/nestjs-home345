import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsBoolean, IsInt, Min } from "class-validator";
import { NotificationType } from "@prisma/client";
import { Transform } from "class-transformer";

export class QueryNotificationDto {
  @ApiPropertyOptional({
    enum: NotificationType,
    description:
      "Filter by type: info | task | event | approval | client_external | system",
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isRead?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;
}
