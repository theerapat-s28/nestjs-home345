import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Request,
  Query,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { LocalStorageService } from "./local-storage.service";

@ApiTags("local-storage")
@Controller("local-storage")
export class LocalStorageController {
  constructor(private readonly localStorageService: LocalStorageService) {}

  @Post("upload/single")
  @ApiOperation({ summary: "Upload a single file to local storage" })
  @ApiConsumes("multipart/form-data")
  @ApiQuery({
    name: "folder",
    required: false,
    description: "Optional subfolder name (e.g., 'avatars')",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  uploadSingle(@UploadedFile() file: any, @Query("folder") folder?: string) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    return {
      message: "File uploaded successfully",
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: this.localStorageService.getFileUrl(file.filename, folder),
      },
    };
  }

  @Post("upload/multiple")
  @ApiOperation({ summary: "Upload multiple files to local storage" })
  @ApiConsumes("multipart/form-data")
  @ApiQuery({
    name: "folder",
    required: false,
    description: "Optional subfolder name (e.g., 'items')",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor("files"))
  uploadMultiple(
    @UploadedFiles() files: any[],
    @Query("folder") folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    const results = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: this.localStorageService.getFileUrl(file.filename, folder),
    }));

    return {
      message: `${files.length} files uploaded successfully`,
      data: results,
    };
  }
}
