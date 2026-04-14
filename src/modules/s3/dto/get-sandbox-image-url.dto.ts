import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetSandboxImageUrlDto {
  @ApiProperty({
    example: "image.jpg",
    description: "The original name of the image file.",
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: "image/jpeg",
    description:
      "The MIME type of the image. Allowed: image/jpeg, image/png, image/webp, image/gif",
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
