import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { readFileSync } from "fs";
import { join } from "path";

import { Public } from "@auth/decorators/public.decorator";

@ApiTags("Public")
@Controller()
export class PublicController {
  @Public()
  @Get("version")
  @ApiOperation({ summary: "Get application version" })
  getVersion() {
    return { version: process.env.APP_VERSION || "unknown" };
  }

  @Public()
  @Get("health-check")
  @ApiOperation({ summary: "Check API health status" })
  getHealthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get("prisma-schema")
  @ApiOperation({ summary: "Get Prisma schema (Public)" })
  @Header("Content-Type", "text/plain")
  getPrismaSchema() {
    return readFileSync(
      join(process.cwd(), "prisma", "schema.prisma"),
      "utf-8",
    );
  }
}
