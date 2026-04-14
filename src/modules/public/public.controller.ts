import { Controller, Get, Header } from "@nestjs/common";
import { readFileSync } from "fs";
import { join } from "path";

import { Public } from "@auth/decorators/public.decorator";

@Controller()
export class PublicController {
  @Public()
  @Get("version")
  getVersion() {
    return { version: process.env.APP_VERSION || "unknown" };
  }

  @Public()
  @Get("prisma-schema")
  @Header("Content-Type", "text/plain")
  getPrismaSchema() {
    return readFileSync(
      join(process.cwd(), "prisma", "schema.prisma"),
      "utf-8",
    );
  }
}
