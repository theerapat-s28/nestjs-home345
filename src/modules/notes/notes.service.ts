import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "@core/prisma/prisma.service";
import { LocalStorageService } from "@modules/local-storage/local-storage.service";
import { CreateNoteDto } from "./dtos/create-note.dto";
import { UpdateNoteDto } from "./dtos/update-note.dto";
import { QueryNoteDto } from "./dtos/query-note.dto";

// ── Constants ──────────────────────────────────────────────────────────────────

const NOTES_FOLDER = "note-attachments";

// ── Select shapes ──────────────────────────────────────────────────────────────

const attachmentSelect = {
  id: true,
  noteId: true,
  key: true,
  fileName: true,
  mimeType: true,
  createdAt: true,
} satisfies Prisma.NoteAttachmentSelect;

const noteSelect = {
  id: true,
  title: true,
  content: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  attachments: {
    select: attachmentSelect,
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.NoteSelect;

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  // ── Notes CRUD ─────────────────────────────────────────────────────────────

  async create(dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      select: noteSelect,
    });
    return { message: "Note created successfully", data: this.enrichNote(note) };
  }

  async findAll(query: QueryNoteDto) {
    const { search, includeExpired = false, limit = 20, offset = 0 } = query;

    const conditions: Prisma.NoteWhereInput[] = [];

    if (!includeExpired) {
      const now = new Date();
      conditions.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
    }

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    const where: Prisma.NoteWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [notes, totalRecords] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        select: noteSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      data: notes.map((n) => this.enrichNote(n)),
      meta: { totalRecords, limit, offset },
    };
  }

  async findOne(id: string) {
    const note = await this.ensureExists(id);
    return this.enrichNote(note);
  }

  async update(id: string, dto: UpdateNoteDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.note.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      select: noteSelect,
    });
    return { message: "Note updated successfully", data: this.enrichNote(updated) };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    const attachments = await this.prisma.noteAttachment.findMany({
      where: { noteId: id },
      select: { key: true },
    });
    await Promise.all(
      attachments.map((a) =>
        this.localStorageService.deleteFile(a.key, NOTES_FOLDER),
      ),
    );
    await this.prisma.note.delete({ where: { id } });
    return { message: "Note deleted successfully", data: null };
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  async addAttachment(noteId: string, file: Express.Multer.File) {
    await this.ensureExists(noteId);
    const attachment = await this.prisma.noteAttachment.create({
      data: {
        noteId,
        key: file.filename,
        fileName: file.originalname,
        mimeType: file.mimetype,
      },
      select: attachmentSelect,
    });
    return {
      message: "Attachment uploaded successfully",
      data: this.enrichAttachment(attachment),
    };
  }

  async removeAttachment(noteId: string, attachmentId: string) {
    const attachment = await this.prisma.noteAttachment.findFirst({
      where: { id: attachmentId, noteId },
      select: attachmentSelect,
    });
    if (!attachment)
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    await this.localStorageService.deleteFile(attachment.key, NOTES_FOLDER);
    await this.prisma.noteAttachment.delete({ where: { id: attachmentId } });
    return { message: "Attachment deleted successfully", data: null };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async ensureExists(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      select: noteSelect,
    });
    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }

  private enrichAttachment(
    attachment: Prisma.NoteAttachmentGetPayload<{ select: typeof attachmentSelect }>,
  ) {
    return {
      ...attachment,
      url: this.localStorageService.getFileUrl(attachment.key, NOTES_FOLDER),
    };
  }

  private enrichNote(
    note: Prisma.NoteGetPayload<{ select: typeof noteSelect }>,
  ) {
    return {
      ...note,
      attachments: note.attachments.map((a) => this.enrichAttachment(a)),
    };
  }
}
