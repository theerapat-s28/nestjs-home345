import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetEntityDocUrlDto {
  @ApiProperty({
    example: "items",
    description:
      "The entity type / S3 folder category (e.g. items, posts, media).",
  })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({
    example: "abc-123",
    description: "The ID of the entity that owns the file.",
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    example: "report.pdf",
    description: "The original name of the file being uploaded.",
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: "application/pdf",
    description: "The MIME type of the file.",
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
