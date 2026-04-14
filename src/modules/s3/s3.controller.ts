import {
  Controller,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Query,
} from "@nestjs/common";
import { S3Service } from "./s3.service";
import { GetPresignedUrlDto } from "./dto/get-presigned-url.dto";
import { GetEntityDocUrlDto } from "./dto/get-entity-doc-url.dto";
import { GetProfileImagePresignedUrlDto } from "./dto/get-profile-image-presigned-url.dto";
import { GetSandboxImageUrlDto } from "./dto/get-sandbox-image-url.dto";
import { GetFileUrlDto } from "./dto/get-file-url.dto";
import { DeleteFileDto } from "./dto/delete-file.dto";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("s3")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("s3")
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  // ─── Generic upload ────────────────────────────────────────────────────────

  @Post("presigned-url")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get an S3 presigned URL for a direct file upload to any folder",
  })
  @ApiResponse({
    status: 200,
    description: "Returns the presigned URL and the S3 object key.",
  })
  async getPresignedUrl(@Body() dto: GetPresignedUrlDto) {
    return this.s3Service.getPresignedUrl(
      dto.fileName,
      dto.contentType,
      dto.folder,
    );
  }

  // ─── Entity-scoped document upload ────────────────────────────────────────

  @Post("entity-doc-presigned")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Get an S3 presigned URL for uploading a document scoped to any entity type",
    description:
      "Pass `entityType` (e.g. items, posts) and `entityId` to upload a document into that entity's folder.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns the presigned URL and the S3 object key for the entity document.",
  })
  async getEntityDocumentPresignedUrl(@Body() dto: GetEntityDocUrlDto) {
    return this.s3Service.getEntityDocumentPresignedUrl(
      dto.entityType,
      dto.entityId,
      dto.fileName,
      dto.contentType,
    );
  }

  // ─── Profile image upload ─────────────────────────────────────────────────

  @Post("profile-image-presigned")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Get an S3 presigned URL for uploading the current user's profile image",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns the presigned URL and the S3 object key for the profile image.",
  })
  async getProfileImagePresignedUrl(
    @Request() req: any,
    @Body() dto: GetProfileImagePresignedUrlDto,
  ) {
    const userId = req.user.id;
    return this.s3Service.getProfileImagePresignedUrl(
      userId,
      dto.fileName,
      dto.contentType,
    );
  }

  // ─── Sandbox image upload (dev only) ─────────────────────────────────────

  @Post("sandbox-image-presigned")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get an S3 presigned URL for uploading a sandbox image (dev only)",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns the presigned URL and the S3 object key for the sandbox image.",
  })
  async getSandboxImagePresignedUrl(@Body() dto: GetSandboxImageUrlDto) {
    return this.s3Service.getSandboxImagePresignedUrl(
      dto.fileName,
      dto.contentType,
    );
  }

  // ─── File retrieval ────────────────────────────────────────────────────────

  @Get("get-file-url")
  @ApiOperation({
    summary: "Get a time-limited URL from S3 to view or download a file",
  })
  @ApiResponse({
    status: 200,
    description: "Returns the signed URL with a 1-hour expiry.",
  })
  async getFileUrl(@Query() dto: GetFileUrlDto) {
    const url = await this.s3Service.getFileUrl(dto.key, dto.fileName);
    return { url };
  }

  // ─── File deletion ─────────────────────────────────────────────────────────

  @Delete("delete-file")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete a file from S3 by its key" })
  @ApiResponse({
    status: 200,
    description: "The file has been successfully deleted from S3.",
  })
  async deleteFile(@Query() dto: DeleteFileDto) {
    await this.s3Service.deleteFile(dto.key);
    return { message: "File deleted successfully" };
  }
}
