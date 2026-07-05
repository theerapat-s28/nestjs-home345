import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "@auth/decorators/public.decorator";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./dtos/create-note.dto";
import { UpdateNoteDto } from "./dtos/update-note.dto";
import { QueryNoteDto } from "./dtos/query-note.dto";

@ApiTags("Notes")
@Public()
@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // ── Notes ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new note" })
  create(@Body() dto: CreateNoteDto) {
    return this.notesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all notes (excludes expired by default)" })
  findAll(@Query() query: QueryNoteDto) {
    return this.notesService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single note with its attachments" })
  @ApiParam({ name: "id", description: "Note UUID" })
  findOne(@Param("id") id: string) {
    return this.notesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a note" })
  @ApiParam({ name: "id", description: "Note UUID" })
  update(@Param("id") id: string, @Body() dto: UpdateNoteDto) {
    return this.notesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a note and all its attachments" })
  @ApiParam({ name: "id", description: "Note UUID" })
  remove(@Param("id") id: string) {
    return this.notesService.remove(id);
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  @Post(":noteId/attachments")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Upload a file and attach it to a note (max 10 MB)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "noteId", description: "Note UUID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  addAttachment(
    @Param("noteId") noteId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.notesService.addAttachment(noteId, file);
  }

  @Delete(":noteId/attachments/:attachmentId")
  @ApiOperation({ summary: "Delete an attachment from disk and the database" })
  @ApiParam({ name: "noteId", description: "Note UUID" })
  @ApiParam({ name: "attachmentId", description: "Attachment UUID" })
  removeAttachment(
    @Param("noteId") noteId: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    return this.notesService.removeAttachment(noteId, attachmentId);
  }
}
