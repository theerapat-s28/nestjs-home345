import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { LocalStorageService } from "./local-storage.service";
import { LocalStorageController } from "./local-storage.controller";

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: (req, file, callback) => {
            const uploadsBase =
              configService.get<string>("LOCAL_UPLOADS_DEST") || "./uploads";
            const folder = req.query.folder as string;
            const finalPath = folder ? join(uploadsBase, folder) : uploadsBase;

            if (!fs.existsSync(finalPath)) {
              fs.mkdirSync(finalPath, { recursive: true });
            }
            callback(null, finalPath);
          },
          filename: (req, file, callback) => {
            // Generate a unique filename: timestamp-randomId.extension
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
        },
      }),
    }),
  ],
  providers: [LocalStorageService],
  controllers: [LocalStorageController],
  exports: [LocalStorageService],
})
export class LocalStorageModule {}
