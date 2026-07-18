import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { LocalStorageModule } from "@modules/local-storage/local-storage.module";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

const NOTES_FOLDER = "note-attachments";

@Module({
  imports: [
    LocalStorageModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          const base = process.env.LOCAL_UPLOADS_DEST || "./uploads";
          const dest = join(base, NOTES_FOLDER);
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          callback(null, dest);
        },
        filename: (req, file, callback) => {
          const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
          callback(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  ],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
