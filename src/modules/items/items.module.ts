import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

/**
 * ItemsModule — Example personal project feature module.
 *
 * To activate this module:
 *   1. Uncomment the `Item` model in prisma/schema.prisma
 *   2. Run `pnpm migrate:dev` to apply the schema change
 *   3. Import ItemsModule in app.module.ts
 */
@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
