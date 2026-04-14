import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppService } from "./app.service";
import { PrismaModule } from "@core/prisma/prisma.module";
import { DateModule } from "@core/date/date.module";
import { WebsocketModule } from "@core/websocket/websocket.module";
import { UsersModule } from "@modules/users/users.module";
import { AuthModule } from "@auth/auth.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { UserProfilesModule } from "@modules/user-profiles/user-profiles.module";
import { S3Module } from "@modules/s3/s3.module";
import { PublicModule } from "@modules/public/public.module";
import { LocalStorageModule } from "@modules/local-storage/local-storage.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as path from "path";

// ─── Personal Project Feature Modules ─────────────────────────────────────────
// Import your own feature modules here following the same pattern:
// import { ItemsModule } from "@modules/items/items.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV
        ? `.env.${process.env.NODE_ENV}`
        : ".env",
    }),
    // ─── Core Infrastructure ───────────────────────────────────────────────────
    PrismaModule,
    DateModule,
    WebsocketModule,

    // ─── Auth & Users ─────────────────────────────────────────────────────────
    UsersModule,
    AuthModule,
    UserProfilesModule,

    // ─── Shared Services ─────────────────────────────────────────────────────
    NotificationsModule,
    S3Module,
    PublicModule,
    LocalStorageModule,
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadDir = configService.get<string>("LOCAL_UPLOADS_DEST") || "uploads";
        return [
          {
            rootPath: path.join(process.cwd(), uploadDir),
            serveRoot: `/${uploadDir}`,
          },
        ];
      },
    }),

    // ─── Personal Project Features ────────────────────────────────────────────
    // Add your feature modules here:
    // ItemsModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
