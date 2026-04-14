import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dtos/create-item.dto";
import { UpdateItemDto } from "./dtos/update-item.dto";
import { QueryItemDto } from "./dtos/query-item.dto";

/**
 * ItemsController — Example personal project feature controller.
 *
 * All routes are JWT-protected by the global JwtAuthGuard (see app.module.ts).
 * Ownership enforcement is delegated to ItemsService.
 *
 * Copy and rename this module to build any CRUD feature:
 *   1. Duplicate the `items/` folder
 *   2. Replace "Item/item/items" with your entity name
 *   3. Add your Prisma model to schema.prisma
 *   4. Register the module in app.module.ts
 */
@ApiTags("Items")
@ApiBearerAuth("access-token")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  // ─── POST /api/items ──────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new item (owned by the current user)" })
  create(@Request() req: any, @Body() dto: CreateItemDto) {
    return this.itemsService.create(req.user.id, dto);
  }

  // ─── GET /api/items ───────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary:
      "List items (users see only their own; admins see all). Supports search + pagination.",
  })
  findAll(@Request() req: any, @Query() query: QueryItemDto) {
    return this.itemsService.findAll(req.user.id, req.user.role, query);
  }

  // ─── GET /api/items/:id ───────────────────────────────────────────────────

  @Get(":id")
  @ApiOperation({ summary: "Get a single item by ID" })
  @ApiParam({ name: "id", description: "Item UUID" })
  findOne(@Request() req: any, @Param("id") id: string) {
    return this.itemsService.findOne(id, req.user.id, req.user.role);
  }

  // ─── PATCH /api/items/:id ─────────────────────────────────────────────────

  @Patch(":id")
  @ApiOperation({ summary: "Update an item (owner or admin only)" })
  @ApiParam({ name: "id", description: "Item UUID" })
  update(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, req.user.id, req.user.role, dto);
  }

  // ─── DELETE /api/items/:id ────────────────────────────────────────────────

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete an item (owner or admin only)" })
  @ApiParam({ name: "id", description: "Item UUID" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.itemsService.remove(id, req.user.id, req.user.role);
  }
}
