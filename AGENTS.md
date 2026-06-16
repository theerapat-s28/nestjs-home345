# CLAUDE.md — Personal NestJS API

**Stack:** NestJS v10 · Prisma 7 · PostgreSQL · Socket.IO · JWT + Google OAuth · AWS S3  
**Package manager:** `pnpm` only — never `npm` or `yarn`.  
**Reference module:** `src/modules/items/` — copy this as a template for every new feature.

---

## Syntax Check (Required)

After every code change, always verify syntax before considering the task complete:

```bash
pnpm lint          # ESLint — catch syntax and style errors
pnpm build         # TypeScript compile — catch type errors
```

Run both. Fix all errors before finishing. Never skip this step.

---

## Commands

```bash
# Dev
pnpm start              # watch mode (NODE_ENV=development)
pnpm lint && pnpm format

# Database (always suffix :dev for local, :prod for production)
pnpm migrate:dev        # create + apply migration
pnpm generate:dev       # regenerate Prisma client after schema change
pnpm status:dev         # check migration status

# Docker
pnpm docker             # rebuild + restart all services
pnpm kill               # kill port 3000  |  pnpm kill:dev → port 5000
```

---

## Project Structure

```
src/
├── app.module.ts               ← register all feature modules here
├── main.ts                     ← bootstrap, global pipes, Swagger
├── core/                       ← @Global() infrastructure (never import manually)
│   ├── prisma/                 ← PrismaService
│   ├── websocket/              ← WebsocketGateway + WebsocketService
│   ├── date/                   ← DateService (Bangkok TZ helpers)
│   └── interceptor/            ← ResponseInterceptor, ErrorInterceptor
├── auth/                       ← JWT, Google OAuth, guards, decorators
│   ├── decorators/             ← @Public(), @Admin(), @Roles()
│   └── guards/                 ← JwtAuthGuard, RolesGuard
├── common/helpers/             ← prisma-error.ts, password.util.ts, object.util.ts, api-key.util.ts
└── modules/                    ← ALL feature modules (users, user-profiles, notifications, s3, items…)
```

**Hard rule:** New features go inside `modules/` only. Never add feature folders at `src/` root.

Every feature module layout:

```
src/modules/<feature>/
├── dtos/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   └── query-<feature>.dto.ts    (only if list has filters/pagination)
├── <feature>.controller.ts
├── <feature>.module.ts
└── <feature>.service.ts
```

---

## Forbidden Patterns

| ❌ Never                                        | ✅ Instead                                                      |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `import { PrismaClient } from '@prisma/client'` | Inject `PrismaService` from `@core/prisma/prisma.service`       |
| Business logic in a controller                  | Delegate everything to the service                              |
| `prisma.x.delete()` when model has `deletedAt`  | Set `deletedAt: new Date()` (soft-delete)                       |
| `return { success: true, data: ... }` wrapper   | Just `return` — `ResponseInterceptor` wraps it                  |
| `catch (error)` for Prisma errors               | Let `ErrorInterceptor` handle automatically                     |
| `npm install` / `yarn add`                      | `pnpm add`                                                      |
| `select` defined inside a method                | Define `const <model>Select` at module scope                    |
| Querying DB twice for the same record           | Use private `ensureExists()` helper                             |
| Missing `select` when sensitive fields exist    | Always use explicit `select` (never expose `password`, `token`) |
| Querying DB in a controller                     | Service only                                                    |

---

## New Module: Step-by-Step

### 1 — Prisma model

```prisma
model MyFeature {
  id          String    @id @default(uuid())
  userId      String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz
  deletedAt   DateTime? @db.Timestamptz
  owner       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([deletedAt])
  @@map("my_features")
}
```

Then: `pnpm migrate:dev && pnpm generate:dev`

### 2 — DTOs

```typescript
// create-my-feature.dto.ts
export class CreateMyFeatureDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

// update-my-feature.dto.ts
export class UpdateMyFeatureDto extends PartialType(CreateMyFeatureDto) {}

// query-my-feature.dto.ts
export class QueryMyFeatureDto {
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;
}
```

### 3 — Service

```typescript
const myFeatureSelect = {
  id: true,
  title: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class MyFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMyFeatureDto) {
    const item = await this.prisma.myFeature.create({
      data: { ...dto, userId },
      select: myFeatureSelect,
    });
    return { message: "Created successfully", data: item };
  }

  async findAll(userId: string, { search, limit, offset }: QueryMyFeatureDto) {
    const where = {
      userId,
      deletedAt: null,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, totalRecords] = await this.prisma.$transaction([
      this.prisma.myFeature.findMany({
        where,
        select: myFeatureSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.myFeature.count({ where }),
    ]);
    return { data, meta: { totalRecords, limit, offset } };
  }

  async findOne(id: string, userId: string) {
    return this.ensureExists(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateMyFeatureDto) {
    await this.ensureExists(id, userId);
    const updated = await this.prisma.myFeature.update({
      where: { id },
      data: dto,
      select: myFeatureSelect,
    });
    return { message: "Updated successfully", data: updated };
  }

  async remove(id: string, userId: string) {
    await this.ensureExists(id, userId);
    await this.prisma.myFeature.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Deleted successfully", data: null };
  }

  private async ensureExists(id: string, userId: string) {
    const item = await this.prisma.myFeature.findFirst({
      where: { id, userId, deletedAt: null },
      select: myFeatureSelect,
    });
    if (!item) throw new NotFoundException(`MyFeature ${id} not found`);
    return item;
  }
}
```

### 4 — Controller

```typescript
@ApiTags("MyFeature")
@ApiBearerAuth("access-token")
@Controller("my-feature")
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create" })
  create(@Request() req, @Body() dto: CreateMyFeatureDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List with pagination" })
  findAll(@Request() req, @Query() query: QueryMyFeatureDto) {
    return this.service.findAll(req.user.id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get by ID" })
  @ApiParam({ name: "id" })
  findOne(@Request() req, @Param("id") id: string) {
    return this.service.findOne(id, req.user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update" })
  @ApiParam({ name: "id" })
  update(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateMyFeatureDto,
  ) {
    return this.service.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete" })
  @ApiParam({ name: "id" })
  remove(@Request() req, @Param("id") id: string) {
    return this.service.remove(id, req.user.id);
  }
}
```

### 5 — Module + register

```typescript
// my-feature.module.ts
@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService],
})
export class MyFeatureModule {}

// src/app.module.ts — add under "Personal Project Features"
import { MyFeatureModule } from "@modules/my-feature/my-feature.module";
```

---

## Response Shape (automatic — do not wrap manually)

`ResponseInterceptor` wraps every return automatically:

```json
{
  "httpCode": 200,
  "message": "Success",
  "data": {},
  "pagination": null,
  "timestamp": "…",
  "path": "/api/…"
}
```

- **Custom message:** `return { message: "Item created", data: created };`
- **Pagination:** `return { data, meta: { totalRecords, limit, offset } };`
- **Errors:** throw NestJS exceptions only (`NotFoundException`, `BadRequestException`, `ForbiddenException`). Never catch Prisma errors manually.

---

## Auth & Authorization

All routes are JWT-protected globally. Opt out with decorators:

| Scenario            | Decorator            | Import                              |
| ------------------- | -------------------- | ----------------------------------- |
| Protected (default) | _(none)_             | —                                   |
| Public, no auth     | `@Public()`          | `@auth/decorators/public.decorator` |
| Admin only          | `@Admin()`           | `@auth/decorators/admin.decorator`  |
| Custom roles        | `@Roles(Role.admin)` | `@auth/decorators/roles.decorator`  |

`req.user` shape: `{ id: string; username: string; role: Role }`

Dev bypass: `BYPASS_AUTH=true` in `.env.development` injects mock admin — never enable in production.

---

## Path Aliases

| Alias        | Resolves to     | Use for                                      |
| ------------ | --------------- | -------------------------------------------- |
| `@core/*`    | `src/core/*`    | PrismaService, WebsocketService, DateService |
| `@auth/*`    | `src/auth/*`    | Guards, decorators, strategies               |
| `@common/*`  | `src/common/*`  | Shared helpers                               |
| `@modules/*` | `src/modules/*` | Cross-module imports                         |

Use relative imports (`./dtos/…`) within the same module. Use aliases only for cross-boundary imports.

---

## WebSocket Notifications

`WebsocketService` is `@Global()` — inject without importing the module:

```typescript
constructor(private readonly ws: WebsocketService) {}

this.ws.sendToUser(userId, 'notification', payload);   // all tabs of one user
this.ws.sendToClient(socketId, 'my-event', payload);   // single socket
this.ws.broadcast('system-alert', payload);            // all connected clients
```

Send notification via `NotificationsService` (writes DB + pushes WS in one call):

```typescript
await this.notificationsService.create({
  title: "Item approved",
  message: "Your item has been approved.",
  type: NotificationType.INFO,
  data: { itemId: item.id, link: `/items/${item.id}` },
  senderId: actorUserId, // null for system messages
  recipientIds: [item.userId],
});
```

WS event name: `notification`. See [docs/notifications/NOTIFICATION-API.md](docs/notifications/NOTIFICATION-API.md) for full payload shape and frontend handling.

---

## S3 File Uploads

```
POST /api/s3/profile-image-presigned   { fileName, contentType } → { url, key }
POST /api/s3/entity-doc-presigned      { entityType, entityId, fileName, contentType } → { url, key }
GET  /api/s3/get-file-url?key=<key>    → { url }   (expires 1h)
DELETE /api/s3/delete-file?key=<key>
```

Upload the file directly from the browser to the presigned `url`. Store the returned `key` on the entity.

---

## Prisma Workflow

After every `prisma/schema.prisma` change:

```bash
pnpm migrate:dev    # 1. create migration + apply to local DB
pnpm generate:dev   # 2. regenerate client types
pnpm start          # 3. restart dev server
```

Never manually edit migration files.

---

## Environment Files

| File               | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `.env.development` | Local dev — used by all `:dev` scripts   |
| `.env.production`  | Production — used by all `:prod` scripts |
| `.env.example`     | Template                                 |

Key variables: `NODE_ENV`, `BYPASS_AUTH`, `DATABASE_URL`, `JWT_SECRET`, `API_KEY_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_CALLBACK_URL`, `AWS_REGION/ACCESS_KEY_ID/SECRET_ACCESS_KEY/S3_BUCKET`, `PORT`, `FRONTEND_URL`.

---

## Swagger

| URL                                   | Description             |
| ------------------------------------- | ----------------------- |
| `http://localhost:3000/api/docs`      | Swagger UI              |
| `http://localhost:3000/api/docs-json` | Raw OpenAPI JSON        |
| `http://localhost:3000/api/version`   | Public version endpoint |

All routes are prefixed `/api`. Authenticate: `POST /api/auth/login` → copy `access_token` → paste into Swagger **Authorize**.

---

## Naming Conventions

| Item          | Pattern               | Example               |
| ------------- | --------------------- | --------------------- |
| Module folder | `kebab-case`          | `my-feature`          |
| Controller    | `<Feature>Controller` | `MyFeatureController` |
| Service       | `<Feature>Service`    | `MyFeatureService`    |
| Module        | `<Feature>Module`     | `MyFeatureModule`     |
| Create DTO    | `Create<Feature>Dto`  | `CreateMyFeatureDto`  |
| Update DTO    | `Update<Feature>Dto`  | `UpdateMyFeatureDto`  |
| Query DTO     | `Query<Feature>Dto`   | `QueryMyFeatureDto`   |

---

## Prisma Error → HTTP Mapping (automatic via ErrorInterceptor)

| Prisma Code | HTTP | Meaning                          |
| ----------- | ---- | -------------------------------- |
| `P2002`     | 409  | Unique constraint violation      |
| `P2025`     | 404  | Record not found                 |
| `P2003`     | 400  | Foreign key constraint failed    |
| `P2001`     | 404  | Record not found in where clause |

---

## Supplementary Docs

- [docs/CODING-GUIDE.md](docs/CODING-GUIDE.md) — full annotated code examples per section
- [docs/notifications/NOTIFICATION-API.md](docs/notifications/NOTIFICATION-API.md) — notification REST + WS API reference
- [WEBSOCKET.md](WEBSOCKET.md) — Angular frontend WebSocket integration + Nginx WSS config
- [MIGRATION.md](MIGRATION.md) — history of what was removed when forking from the office backend
