import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

/** MIME types allowed for general document uploads. */
const DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
];

/** MIME types allowed for image-only uploads (profile, sandbox). */
const IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>("AWS_REGION");
    const accessKeyId = this.configService.getOrThrow<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.getOrThrow<string>(
      "AWS_SECRET_ACCESS_KEY",
    );
    this.bucketName = this.configService.getOrThrow<string>("AWS_S3_BUCKET");

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // ─── Generic upload URL ───────────────────────────────────────────────────

  /**
   * Generate a presigned PUT URL for any folder/key.
   * The caller is responsible for validating allowed MIME types.
   *
   * @param fileName   Original file name (used to generate the S3 key)
   * @param contentType  MIME type of the file
   * @param folder     S3 folder prefix (e.g. "user-uploads", "my-entity/123")
   * @param allowedTypes Override the default allowed MIME types
   */
  async getPresignedUrl(
    fileName: string,
    contentType: string,
    folder: string,
    allowedTypes: string[] = DOCUMENT_ALLOWED_TYPES,
  ): Promise<{ url: string; key: string }> {
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${allowedTypes.join(", ")}`,
      );
    }

    try {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const key = `${folder}/${uniqueSuffix}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // URL expires in 15 minutes (900 seconds)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      return { url, key };
    } catch (error) {
      console.error("Error generating S3 presigned URL", error);
      throw new InternalServerErrorException("Could not generate upload URL");
    }
  }

  // ─── Entity document upload ───────────────────────────────────────────────

  /**
   * Generate a presigned PUT URL for an entity-scoped document folder.
   *
   * Usage example:
   *   getEntityDocumentPresignedUrl("items", "abc123", "report.pdf", "application/pdf")
   *   → key: "items/abc123/1234567890-ab1cd2ef.pdf"
   *
   * @param entityType  Folder category (e.g. "items", "posts", "media")
   * @param entityId    ID of the entity that owns the file
   * @param fileName    Original file name (extension preserved)
   * @param contentType MIME type of the file
   */
  async getEntityDocumentPresignedUrl(
    entityType: string,
    entityId: string,
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    if (!DOCUMENT_ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${DOCUMENT_ALLOWED_TYPES.join(", ")}`,
      );
    }

    try {
      const ext = fileName.split(".").pop() || "";
      const shortId = Date.now() + "-" + randomBytes(4).toString("hex");
      const key = `${entityType}/${entityId}/${shortId}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // URL expires in 15 minutes
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      return { url, key };
    } catch (error) {
      console.error(`Error generating S3 ${entityType} presigned URL`, error);
      throw new InternalServerErrorException(
        `Could not generate ${entityType} upload URL`,
      );
    }
  }

  // ─── Profile image upload ─────────────────────────────────────────────────

  /**
   * Generate a presigned PUT URL for a user profile image.
   * The key is deterministic per user — re-uploading replaces the old image.
   *
   * @param userId      The user's ID (used to namespace the S3 key)
   * @param fileName    Original file name (extension used for key)
   * @param contentType Must be an image MIME type
   */
  async getProfileImagePresignedUrl(
    userId: string,
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    if (!IMAGE_ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${IMAGE_ALLOWED_TYPES.join(", ")}`,
      );
    }

    try {
      const ext = fileName.split(".").pop() || "";
      // Key is deterministic per user — re-uploading replaces the old profile image
      const key = `profiles/${userId}/avatar.${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // URL expires in 5 minutes
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 300,
      });

      return { url, key };
    } catch (error) {
      console.error("Error generating S3 profile image presigned URL", error);
      throw new InternalServerErrorException(
        "Could not generate profile image upload URL",
      );
    }
  }

  // ─── Sandbox / development image upload ──────────────────────────────────

  /**
   * Generate a presigned PUT URL for sandbox/testing image uploads.
   * Intended for development only.
   */
  async getSandboxImagePresignedUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    if (!IMAGE_ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${IMAGE_ALLOWED_TYPES.join(", ")}`,
      );
    }

    try {
      const ext = fileName.split(".").pop() || "";
      const shortId = Date.now() + "-" + randomBytes(4).toString("hex");
      const key = `sandbox-docs/images/${shortId}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      // URL expires in 15 minutes
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      return { url, key };
    } catch (error) {
      console.error("Error generating S3 sandbox image presigned URL", error);
      throw new InternalServerErrorException(
        "Could not generate sandbox image upload URL",
      );
    }
  }

  // ─── Retrieve file ────────────────────────────────────────────────────────

  /**
   * Generate a time-limited GET URL to view or download a file from S3.
   * Sets `Content-Disposition` to `attachment` for office/archive files,
   * and `inline` for images and PDFs.
   *
   * @param key      S3 object key
   * @param fileName Optional original name for Content-Disposition header
   */
  async getFileUrl(key: string, fileName?: string): Promise<string> {
    try {
      let disposition = "inline";
      if (fileName) {
        const ext = (fileName.split(".").pop() || "").toLowerCase();
        const downloadTypes = [
          "doc",
          "docx",
          "xls",
          "xlsx",
          "zip",
          "rar",
          "7z",
          "tar",
          "gz",
        ];
        if (downloadTypes.includes(ext)) {
          disposition = "attachment";
        }
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: fileName
          ? `${disposition}; filename="${fileName.replace(/"/g, "")}"`
          : undefined,
      });

      // URL expires in 1 hour (3600 seconds)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      return url;
    } catch (error) {
      console.error("Error generating S3 GET presigned URL", error);
      throw new InternalServerErrorException("Could not generate view URL");
    }
  }

  // ─── Delete file ──────────────────────────────────────────────────────────

  /**
   * Permanently delete a file from S3 by its key.
   *
   * @param key  S3 object key to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error("Error deleting S3 object", error);
      throw new InternalServerErrorException("Could not delete file from S3");
    }
  }
}
