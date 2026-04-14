import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetPresignedUrlDto {
  @ApiProperty({
    example: "my-document.pdf",
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

  @ApiProperty({
    example: "documents",
    description: "The main folder where the file will be uploaded.",
  })
  @IsString()
  @IsNotEmpty()
  folder: string;
}
