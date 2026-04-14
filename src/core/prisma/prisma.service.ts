// src/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ Connected to database");
    } catch (error) {
      this.logger.error("❌ Database connection failed", error);
      throw new Error("Database connection failed");
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("🔌 Disconnected from database");
  }

  async enableShutdownHooks(app: INestApplication) {
    const shutdown = async (signal: string) => {
      this.logger.log(`[Shutdown] 📴 Signal received: ${signal}`);
      await this.$disconnect();
      await app.close();
      this.logger.log("[NestJS] 👋 Application closed");
    };

    process.on("beforeExit", async () => await shutdown("beforeExit"));
    process.on("SIGINT", async () => await shutdown("SIGINT (Ctrl+C)"));
    process.on(
      "SIGTERM",
      async () => await shutdown("SIGTERM (kill/docker stop)"),
    );
  }

  /**
   * Utility for isolated Prisma jobs (like CRON, migrations)
   */
  async runJob<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    await this.$connect();
    this.logger.log("[Prisma Job] 🚀 Connected");
    try {
      return await fn(this);
    } finally {
      await this.$disconnect();
      this.logger.log("[Prisma Job] 📴 Disconnected");
    }
  }
}
