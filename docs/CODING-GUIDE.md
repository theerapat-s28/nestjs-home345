# Coding Guide — Personal NestJS API

This guide defines exactly how to write code in this project. Follow every rule strictly. When in doubt, use `src/modules/items/` as the reference implementation.

---

## 1. Package Manager

**Always use `pnpm`.** Never use `npm` or `yarn`.

### Key Commands

#### Development

```bash
pnpm start          # Start dev server (NODE_ENV=development, watch mode)
pnpm start:dev      # Alias for pnpm start
pnpm start:debug    # Start with Node.js debugger attached
```

#### Build & Production

```bash
pnpm build          # Compile TypeScript → dist/
pnpm start:prod     # Run compiled production build
```

#### Code Quality

```bash
pnpm lint           # Auto-fix ESLint issues across src/ and test/
pnpm format         # Auto-format all TypeScript files with Prettier
```

#### Testing

```bash
pnpm test           # Run all unit tests once
pnpm test:watch     # Watch mode
pnpm test:cov       # Generate coverage report
pnpm test:e2e       # End-to-end tests
```

#### Prisma / Database

> Always suffix with `:dev` for local and `:prod` for production. These scripts inject the correct `.env` file automatically via `dotenv-cli`.

```bash
pnpm validate:dev       # Validate the schema
pnpm migrate:dev        # Create and apply a new migration (dev only)
pnpm migrate:prod       # Apply existing migrations (production deployment)
pnpm generate:dev       # Regenerate Prisma client after schema changes
pnpm generate:prod
pnpm status:dev         # Check migration status
pnpm status:prod
```

#### Docker & Utilities

```bash
pnpm docker         # Rebuild and restart all Docker services
pnpm kill           # Kill process on port 3000
pnpm kill:dev       # Kill process on port 5000
```

---

## 2. Project Structure

```
src/
├── app.module.ts               ← Register all feature modules here
├── main.ts                     ← Bootstrap, global pipes/interceptors, Swagger
│
├── core/                       ← Framework-level infrastructure (all @Global())
│   ├── prisma/                 ← PrismaService
│   ├── websocket/              ← WebsocketGateway + WebsocketService
│   ├── date/                   ← DateService (timezone helpers)
│   └── interceptor/            ← ResponseInterceptor, ErrorInterceptor
│
├── auth/                       ← JWT + Google OAuth, guards, decorators
│   ├── decorators/             ← @Public(), @Admin(), @Roles()
│   ├── guards/                 ← JwtAuthGuard, RolesGuard, GoogleAuthGuard
│   ├── strategies/             ← jwt.strategy, google.strategy
│   └── dtos/
│
├── common/                     ← Shared helpers used across the whole app
│   └── helpers/
│       ├── prisma-error.ts     ← handlePrismaError()
│       ├── password.util.ts    ← validatePassword()
│       ├── object.util.ts      ← omit<T, K>()
│       └── api-key.util.ts     ← generateApiKey(), verifyApiKey()
│
└── modules/                    ← ALL business feature modules live here
    ├── users/                  ← Admin user CRUD
    ├── user-profiles/          ← User profile CRUD
    ├── notifications/          ← Real-time notifications (WS + DB)
    ├── s3/                     ← Presigned upload/download/delete
    ├── public/                 ← /api/version, /api/prisma-schema (public)
    └── items/                  ← Example module — copy as template for new features
```

**Rule:** `src/` root gets only 4 top-level folders — `core/`, `auth/`, `common/`, `modules/`. Adding a new feature = create a folder inside `modules/`. Never add feature folders at the root.

### Feature Module Layout

Every feature lives in its own folder under `src/modules/`:

```
src/modules/<feature-name>/
├── dtos/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   └── query-<feature>.dto.ts   (if the list endpoint has filters/pagination)
├── <feature>.controller.ts
├── <feature>.module.ts
└── <feature>.service.ts
```

### Naming Conventions

| Item             | Pattern               | Example               |
| ---------------- | --------------------- | --------------------- |
| Module folder    | `kebab-case`          | `my-feature`          |
| Controller class | `<Feature>Controller` | `MyFeatureController` |
| Service class    | `<Feature>Service`    | `MyFeatureService`    |
| Module class     | `<Feature>Module`     | `MyFeatureModule`     |
| Create DTO       | `Create<Feature>Dto`  | `CreateMyFeatureDto`  |
| Update DTO       | `Update<Feature>Dto`  | `UpdateMyFeatureDto`  |
| Query DTO        | `Query<Feature>Dto`   | `QueryMyFeatureDto`   |

---

## 3. Response & Error Shape

### 3.1 Success responses (automatic — just `return`)

The global `ResponseInterceptor` wraps every successful return value automatically:

```json
{
  "httpCode": 200,
  "message": "Success",
  "data": { "..." },
  "pagination": null,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/items"
}
```

To include a custom message, return an object with `data` + `message`:

```typescript
return { message: "Item created successfully", data: created };
```

### 3.2 Paginated responses

Return this shape from your service — the interceptor detects `meta.totalRecords` and fills the `pagination` field:

```typescript
return {
  data: records,
  meta: {
    totalRecords: total,
    limit,
    offset,
  },
};
```

### 3.3 Error handling (automatic — use NestJS exceptions)

The global `ErrorInterceptor` catches all errors. Only throw standard NestJS exceptions in your services:

```typescript
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

throw new NotFoundException("Item not found");
throw new BadRequestException("Invalid value");
throw new ForbiddenException("Access denied");
```

### 3.4 Prisma error handling (automatic — do not catch manually)

`ErrorInterceptor` calls `handlePrismaError()` from `src/common/helpers/prisma-error.ts` automatically. Never catch Prisma errors yourself.

| Prisma Code | HTTP Status | Meaning                            |
| ----------- | ----------- | ---------------------------------- |
| `P2000`     | 400         | Value too long for column          |
| `P2001`     | 404         | Record not found in where clause   |
| `P2002`     | 409         | Unique constraint violation        |
| `P2003`     | 400         | Foreign key constraint failed      |
| `P2004`     | 403         | Database constraint blocked action |
| `P2025`     | 404         | Record not found for update/delete |

---

## 4. Writing a New Feature Module

### Step 1 — Add a Prisma model

```prisma
// prisma/schema.prisma

model Item {
  id          String   @id @default(uuid())
  title       String
  description String?
  userId      String

  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now()) @db.Timestamptz
  updatedAt DateTime  @updatedAt @db.Timestamptz
  deletedAt DateTime? @db.Timestamptz

  owner User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deletedAt])
  @@map("items")
}
```

Then run:

```bash
pnpm migrate:dev    # creates migration + applies to DB
pnpm generate:dev   # regenerates Prisma client types
```

---

### Step 2 — Create DTO (`dtos/create-<feature>.dto.ts`)

- Use `class-validator` decorators for all validation.
- Use `@ApiProperty` / `@ApiPropertyOptional` on every field.
- Optional fields get both `@IsOptional()` and `?` on the TypeScript type.

```typescript
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateItemDto {
  @ApiProperty({ example: "My item title" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: "A short description" })
  @IsString()
  @IsOptional()
  description?: string;
}
```

For the update DTO, use `PartialType` — never duplicate field declarations:

```typescript
import { PartialType } from "@nestjs/mapped-types";
import { CreateItemDto } from "./create-item.dto";

export class UpdateItemDto extends PartialType(CreateItemDto) {}
```

For the query DTO, use `@Transform` to coerce string query params:

```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class QueryItemDto {
  @ApiPropertyOptional({ example: "search term" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;
}
```

---

### Step 3 — Create Service (`<feature>.service.ts`)

**Rules:**

- Inject `PrismaService` from `@core/prisma/prisma.service`.
- Define `const <model>Select` at **module scope** (not inside methods) — reuse it in every query.
- Write a **private `ensureExists` helper** — `findOne` and all mutating methods call it; never query the DB twice for the same record.
- Use soft-delete (`isActive: false`, `deletedAt: new Date()`) if the model has those fields. Always filter `deletedAt: null` in every query.
- Use `$transaction([...])` when writing to more than one table at once.
- Never return fields like `password`, `token`, or `refreshToken` — use explicit `select`.

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";
import { CreateItemDto } from "./dtos/create-item.dto";
import { UpdateItemDto } from "./dtos/update-item.dto";
import { QueryItemDto } from "./dtos/query-item.dto";

// Define safe field selection at module scope
const itemSelect = {
  id: true,
  title: true,
  description: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateItemDto) {
    const item = await this.prisma.item.create({
      data: { ...dto, userId },
      select: itemSelect,
    });
    return { message: "Item created successfully", data: item };
  }

  async findAll(userId: string, query: QueryItemDto) {
    const { search, limit, offset } = query;

    const where: any = {
      userId, // scope to current user
      deletedAt: null,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, totalRecords] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        select: itemSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.item.count({ where }),
    ]);

    return { data: items, meta: { totalRecords, limit, offset } };
  }

  async findOne(id: string, userId: string) {
    return this.ensureExists(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateItemDto) {
    await this.ensureExists(id, userId);
    const updated = await this.prisma.item.update({
      where: { id },
      data: dto,
      select: itemSelect,
    });
    return { message: "Item updated successfully", data: updated };
  }

  async remove(id: string, userId: string) {
    await this.ensureExists(id, userId);
    await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Item deleted successfully", data: null };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async ensureExists(id: string, userId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, userId, deletedAt: null },
      select: itemSelect,
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }
}
```

---

### Step 4 — Create Controller (`<feature>.controller.ts`)

**Rules:**

- Add `@ApiTags`, `@ApiBearerAuth('access-token')` to the class.
- Add `@ApiOperation({ summary: '...' })` to every route method.
- Add `@ApiParam` for every `:id` segment.
- Controllers contain **zero business logic** — only call the service.
- All routes are JWT-protected by default (global guard). See Section 5 for auth decorators.

```typescript
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

@ApiTags("Items")
@ApiBearerAuth("access-token")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new item" })
  create(@Request() req, @Body() dto: CreateItemDto) {
    return this.itemsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List items with optional search and pagination" })
  findAll(@Request() req, @Query() query: QueryItemDto) {
    return this.itemsService.findAll(req.user.id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single item by ID" })
  @ApiParam({ name: "id", description: "Item UUID" })
  findOne(@Request() req, @Param("id") id: string) {
    return this.itemsService.findOne(id, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an item" })
  @ApiParam({ name: "id", description: "Item UUID" })
  update(@Request() req, @Param("id") id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete an item" })
  @ApiParam({ name: "id", description: "Item UUID" })
  remove(@Request() req, @Param("id") id: string) {
    return this.itemsService.remove(id, req.user.id);
  }
}
```

---

### Step 5 — Create Module (`<feature>.module.ts`)

```typescript
import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";
import { ItemsService } from "./items.service";

@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
```

> `PrismaModule` does **not** need to be imported here — it is `@Global()`.
> Same applies to `WebsocketModule` and `DateModule`.

---

### Step 6 — Register in `AppModule`

```typescript
// src/app.module.ts

import { ItemsModule } from "@modules/items/items.module";

@Module({
  imports: [
    // ... existing imports ...

    // ─── Personal Project Features ──────────────────────────────────────────
    ItemsModule,
  ],
})
export class AppModule {}
```

---

## 5. Authentication & Authorization

All routes are JWT-protected by default via the global `JwtAuthGuard` in `AppModule`.

### Decorator Summary

| Scenario                  | Decorator            | Import from                         |
| ------------------------- | -------------------- | ----------------------------------- |
| Protected route (default) | _(none needed)_      | —                                   |
| Public, no auth           | `@Public()`          | `@auth/decorators/public.decorator` |
| Admin only                | `@Admin()`           | `@auth/decorators/admin.decorator`  |
| Specific role(s)          | `@Roles(Role.admin)` | `@auth/decorators/roles.decorator`  |

### Examples

```typescript
import { Public } from '@auth/decorators/public.decorator';
import { Admin } from '@auth/decorators/admin.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

// Open to everyone
@Public()
@Get('health')
health() { return { status: 'ok' }; }

// Admin-only entire controller
@Admin()
@Controller('admin/settings')
export class AdminSettingsController { ... }

// Single admin-only route
@Admin()
@Delete(':id/force')
forceDelete(@Param('id') id: string) { ... }

// Custom roles
@Roles(Role.admin)
@Get('reports')
getReports() { ... }
```

### Reading the current user

The JWT payload is attached to `req.user` by the guard:

```typescript
// Shape of req.user
{
  id: string; // User UUID
  username: string;
  role: Role; // 'admin' | 'user'
}
```

Access it in a controller via `@Request() req`:

```typescript
@Get('me')
me(@Request() req) {
  return this.service.findOne(req.user.id);
}
```

---

## 6. Path Aliases

Use these TypeScript path aliases (defined in `tsconfig.json`) instead of long relative imports:

| Alias        | Resolves to     | Use for                                                    |
| ------------ | --------------- | ---------------------------------------------------------- |
| `@core/*`    | `src/core/*`    | PrismaService, WebsocketService, DateService, interceptors |
| `@auth/*`    | `src/auth/*`    | Guards, decorators, strategies                             |
| `@common/*`  | `src/common/*`  | Shared helpers (prisma-error, password, object, api-key)   |
| `@modules/*` | `src/modules/*` | Feature module imports across modules                      |

**Within a module**, use relative imports for files inside the same folder (e.g. `./dtos/create-item.dto`). Use the aliases only for cross-boundary imports.

---

## 7. WebSocket Notifications

Inject `WebsocketService` (globally available — no module import needed) to push real-time events.

```typescript
import { WebsocketService } from '@core/websocket/websocket.service';

constructor(private readonly ws: WebsocketService) {}

// Send to all connections of one user (all their browser tabs)
this.ws.sendToUser(userId, 'notification', payload);

// Send to a single socket connection
this.ws.sendToClient(socketId, 'my-event', payload);

// Broadcast to all connected clients
this.ws.broadcast('system-alert', payload);
```

### Sending a notification via the NotificationsService

```typescript
import { NotificationsService } from "../notifications/notifications.service";

await this.notificationsService.create({
  title: "Item approved",
  message: "Your item has been approved.",
  type: NotificationType.info,
  data: { itemId: item.id, link: `/items/${item.id}` },
  senderId: actorUserId, // null for system messages
  recipientIds: [item.userId],
});
```

This writes to the DB **and** pushes the WebSocket event in one call.

---

## 8. S3 File Uploads

### Profile image (current user)

```
POST /api/s3/profile-image-presigned
Body: { fileName: "avatar.jpg", contentType: "image/jpeg" }
→ Returns: { url, key }
```

Upload the file directly from the browser to the `url`. Then save the `key` to `UserProfile.profileImageUrl`.

### Entity document (any entity type)

```
POST /api/s3/entity-doc-presigned
Body: { entityType: "items", entityId: "uuid", fileName: "report.pdf", contentType: "application/pdf" }
→ Returns: { url, key }
```

### Retrieve / download a file

```
GET /api/s3/get-file-url?key=<s3-key>&fileName=<optional-display-name>
→ Returns: { url }   (expires in 1 hour)
```

### Delete a file

```
DELETE /api/s3/delete-file?key=<s3-key>
```

---

## 9. Prisma Workflow

After every change to `prisma/schema.prisma`:

```bash
pnpm migrate:dev    # 1. Create migration file + apply to local DB
pnpm generate:dev   # 2. Regenerate Prisma client types
pnpm start          # 3. Restart dev server
```

Never manually edit migration files. Always let Prisma generate them.

---

## 10. Environment Files

| File               | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `.env.development` | Local dev — used by all `:dev` scripts   |
| `.env.production`  | Production — used by all `:prod` scripts |
| `.env.example`     | Template — copy to create a new env file |

`ConfigModule` in `AppModule` loads the correct env file from `NODE_ENV` automatically. Never call `dotenv` manually in application code.

**Variables at a glance:**

| Variable                                               | Purpose                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| `NODE_ENV`                                             | `development` or `production`                |
| `BYPASS_AUTH`                                          | `true` skips JWT in dev (injects mock admin) |
| `APP_NAME`                                             | Display name in Swagger UI and logs          |
| `APP_VERSION`                                          | Shown in Swagger and `/api/version`          |
| `PORT`                                                 | HTTP port (default 3000)                     |
| `FRONTEND_URL`                                         | CORS origin + OAuth redirect base            |
| `DATABASE_URL`                                         | PostgreSQL connection string                 |
| `JWT_SECRET`                                           | JWT signing secret                           |
| `API_KEY_SECRET`                                       | AES-256 key for api-key encryption           |
| `GOOGLE_CLIENT_ID/SECRET`                              | Google OAuth credentials                     |
| `GOOGLE_CALLBACK_URL`                                  | OAuth callback (must match Google Console)   |
| `AWS_REGION/ACCESS_KEY_ID/SECRET_ACCESS_KEY/S3_BUCKET` | S3 credentials                               |

---

## 11. Swagger / API Docs

| URL                                   | Description          |
| ------------------------------------- | -------------------- |
| `http://localhost:3000/api/docs`      | Swagger UI           |
| `http://localhost:3000/api/docs-json` | Raw OpenAPI JSON     |
| `http://localhost:3000/api/version`   | App version (public) |

All routes are prefixed `/api` globally. `@Controller('items')` → `/api/items`.

Authentication: log in via `POST /api/auth/login` → copy `access_token` → paste into Swagger's **Authorize** dialog.

---

## 12. Forbidden Patterns

| ❌ Never                                            | ✅ Instead                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `import { PrismaClient } from '@prisma/client'`     | Inject `PrismaService` from `@core/prisma/prisma.service`             |
| Business logic in a controller                      | Delegate everything to the service                                    |
| `prisma.x.delete(...)` when model has `deletedAt`   | Set `deletedAt: new Date()` (soft-delete)                             |
| Return without `select` when sensitive fields exist | Always use explicit `select`                                          |
| `catch (error)` for Prisma errors                   | Let `ErrorInterceptor` handle it automatically                        |
| `npm install` / `yarn add`                          | `pnpm add`                                                            |
| `return { success: true, data: ... }` wrapper       | Just `return` — `ResponseInterceptor` wraps it                        |
| Querying DB in controller                           | Delegate to service                                                   |
| Defining `select` inside a method                   | Define `const <model>Select` at module scope                          |
| Querying DB twice for the same record               | Use `ensureExists` helper — call it from both `findOne` and mutations |

---

## 13. Checklist for a New Module

- [ ] Add model to `prisma/schema.prisma` with `@@map`, `@@index([deletedAt])`, soft-delete fields
- [ ] Run `pnpm migrate:dev` and `pnpm generate:dev`
- [ ] Create `src/modules/<feature-name>/dtos/create-<feature>.dto.ts`
- [ ] Create `src/modules/<feature-name>/dtos/update-<feature>.dto.ts` (use `PartialType`)
- [ ] Create `src/modules/<feature-name>/dtos/query-<feature>.dto.ts` (if list endpoint has filters)
- [ ] Create `<feature>.service.ts`:
  - [ ] Define `const <model>Select` at module scope
  - [ ] Private `ensureExists` — reused by `findOne` and all mutations
  - [ ] Soft-delete if model has `deletedAt`
  - [ ] Return `{ message, data }` from create/update/delete
  - [ ] Return `{ data, meta: { totalRecords, limit, offset } }` from list
- [ ] Create `<feature>.controller.ts`:
  - [ ] `@ApiTags`, `@ApiBearerAuth('access-token')` on class
  - [ ] `@ApiOperation`, `@ApiParam` on every method
  - [ ] Zero business logic — only service calls
- [ ] Create `<feature>.module.ts` — exports the service
- [ ] Import and register `<Feature>Module` in `src/app.module.ts`
- [ ] Run `pnpm lint` and `pnpm format`
