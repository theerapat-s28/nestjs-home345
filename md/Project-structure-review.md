# Project Structure Review — `personal-nestjs-api`

## Overview

This is a **NestJS v10 + Prisma 7 + PostgreSQL** backend designed as a reusable personal API starter. It provides JWT + Google OAuth authentication, real-time WebSocket notifications, S3 file management, and a clean extension point for feature modules.

---

## 1. Architecture & Module Layout

```
src/
├── auth/            ← Authentication (JWT, Google OAuth, guards, strategies)
├── common/helpers/  ← Shared utilities (password, Prisma errors, API keys)
├── core/            ← Cross-cutting infrastructure (Prisma, WebSocket, Date, Interceptors)
├── modules/         ← Feature modules (users, notifications, s3, user-profiles, public, items)
├── app.module.ts    ← Root module with clear section comments
└── main.ts          ← Bootstrap with Swagger, CORS, ValidationPipe
```

> [!TIP]
> **Strengths**
>
> - Clean separation of `core/` (infrastructure) vs `modules/` (features) vs `auth/` (security) — this is textbook NestJS organization.
> - Path aliases (`@core/*`, `@auth/*`, `@common/*`, `@modules/*`) in `tsconfig.json` make imports readable and refactor-friendly.
> - The `app.module.ts` is well-commented with section headers, making it obvious where to plug in new features.
> - Scaffold comments in both `schema.prisma` and `app.module.ts` (the `ItemsModule` example) lower the barrier for adding new features.

> [!NOTE]
> **Observations**
>
> - `common/` only contains `helpers/` — it's a bit of a thin layer. As the project grows, you might consider putting shared **DTOs**, **types/interfaces**, **pipes**, and **filters** here too, so `common/` becomes the true "shared kernel."
> - `core/interceptor/` has no `interceptor.module.ts` — the interceptors are registered globally in `main.ts` via `useGlobalInterceptors()`. This is fine but means they can't inject dependencies from the DI container. If you ever need to inject `ConfigService` or a logger into an interceptor, you'd need to register them as providers via `APP_INTERCEPTOR` in a module instead.

---

## 2. Authentication & Security

| Feature           | Status | Notes                                                        |
| ----------------- | ------ | ------------------------------------------------------------ |
| JWT access tokens | ✅     | Via `@nestjs/passport` + `passport-jwt`                      |
| Google OAuth 2.0  | ✅     | Strategy + callback flow                                     |
| Global JWT guard  | ✅     | `APP_GUARD` with `@Public()` decorator escape hatch          |
| Role-based access | ✅     | `RolesGuard` + `@Roles()` decorator                          |
| Dev bypass mode   | ✅     | `BYPASS_AUTH=true` injects mock admin — clever for local dev |
| Password hashing  | ✅     | bcrypt with salt rounds = 10                                 |

> [!WARNING]
> **Missing: Refresh Tokens**
> The current auth flow issues only an access token — no refresh token mechanism. For a production-facing API, this means users will be forced to re-authenticate every time the JWT expires. Consider implementing a refresh token rotation strategy (store hashed refresh tokens in DB, issue alongside access token, expose a `/auth/refresh` endpoint).

> [!IMPORTANT]
> **`strictNullChecks: false`** in `tsconfig.json`
> This is currently off, which masks potential null-pointer bugs at compile time. The `auth.service.ts` already has several `user.profile?.profileImageUrl` optional chains that _hint_ at nullable data — enabling `strictNullChecks` would catch cases where these guards are missing. This is the single highest-impact TypeScript config change you could make.

---

## 3. Database & Prisma

- **Prisma 7** with the **`@prisma/adapter-pg`** driver adapter — modern setup using the native `pg` pool rather than Prisma's built-in connection management.
- Schema is clean with proper `@db.Timestamptz`, `@@map()` for snake_case table names, soft-delete via `deletedAt`, and compound indexes.
- The **polymorphic `DocumentLink`** pattern (with `DocumentEntityType` enum) is a smart, extensible approach for attaching files to arbitrary entities.
- Notification schema is well-designed: sender → notification → recipients (fan-out), with proper `@@unique([userId, notificationId])` to prevent duplicate deliveries.

> [!NOTE]
> **Observation: No soft-delete on `Notification` / `NotificationRecipient`**
> `User` has `deletedAt` + soft-delete, but notifications don't. The `remove()` method in `NotificationsService` does a hard `delete`. This is a design choice — just be aware that deleted notifications are unrecoverable.

> [!TIP]
> **Consider Prisma middleware or `$extends`** for automatic soft-delete filtering across queries, rather than manually adding `where: { deletedAt: null }` in every service method. Prisma 7 `$extends` with query extensions is the idiomatic way now.

---

## 4. WebSocket Layer

The WebSocket setup is clean and well-documented:

- `WebsocketGateway` handles connection lifecycle (auth on connect, user-room join).
- `WebsocketService` provides a high-level facade (`sendToUser`, `broadcast`, `notifyAll`) — services never touch the gateway directly.
- The inline comment block in `websocket.service.ts` explaining `sendToUser()` vs `sendToClient()` semantics is excellent documentation.

> [!NOTE]
> The gateway file is ~5KB — as event types grow, consider splitting event handlers into separate files or using a registry/dispatcher pattern, so the gateway stays focused on connection management.

---

## 5. Interceptors

| Interceptor           | Purpose                                                                           |
| --------------------- | --------------------------------------------------------------------------------- |
| `ResponseInterceptor` | Wraps all responses in `{ httpCode, message, data, pagination, timestamp, path }` |
| `ErrorInterceptor`    | Catches Prisma errors, `HttpException`, and unhandled errors; normalizes shape    |

> [!TIP]
> **The `ResponseInterceptor` has a Prisma Decimal → Number transform** baked in (lines 30-67). This is a practical solution to the "Decimal serialization" problem, but it's doing deep recursive traversal on _every_ response. For high-throughput endpoints, consider flagging which endpoints actually return Decimals and only applying the transform there.

> [!WARNING]
> **Error interceptor leaks stack traces** in the "unhandled error" branch (line 68: `error: error.stack ?? null`). In production, this should be suppressed or redacted to avoid leaking internal implementation details.

---

## 6. Developer Experience & Tooling

| Tool                                                 | Verdict                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm`                                               | ✅ Good — fast, strict, disk-efficient                                           |
| `cross-env`                                          | ✅ Cross-platform `NODE_ENV`                                                     |
| `dotenv-cli`                                         | ✅ Per-environment Prisma commands (`migrate:dev`, `migrate:prod`)               |
| `.env.example`                                       | ✅ Well-documented with section headers                                          |
| Swagger (OpenAPI)                                    | ✅ Auto-generated docs at `/api/docs`, Google login link embedded in description |
| `MIGRATION.md`, `WEBSOCKET.md`, `md/CODING-GUIDE.md` | ✅ Good documentation discipline                                                 |
| ESLint + Prettier                                    | ✅ Standard config                                                               |
| VS Code settings                                     | ✅ `.vscode/` present                                                            |

> [!NOTE]
> **No health check endpoint.** Consider adding `@nestjs/terminus` with a `/api/health` endpoint that checks DB connectivity. This is critical for container orchestration (Kubernetes liveness/readiness probes, Docker `HEALTHCHECK`).

---

## 7. Docker & Deployment

```dockerfile
FROM node:22.12.0          # Single-stage build
RUN npm install -g pnpm    # Matches lockfile version
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main"]
```

> [!WARNING]
> **Single-stage Docker build** — the final image includes all devDependencies, source code, `node_modules`, and build tools (~large image). A **multi-stage build** would significantly reduce image size:
>
> ```dockerfile
> # Stage 1: Build
> FROM node:22-slim AS builder
> ...
> RUN pnpm install --frozen-lockfile && pnpm build
>
> # Stage 2: Production
> FROM node:22-slim
> COPY --from=builder /workspace/dist ./dist
> COPY --from=builder /workspace/node_modules ./node_modules
> ```

> [!NOTE]
> The `docker-compose.yml` uses an **external network** (`form-portal`) and comments out port mapping — this suggests it's deployed behind a reverse proxy (Traefik, Nginx). The compose file is minimal, which is fine, but lacks a `restart: unless-stopped` policy and any `healthcheck` directive.

---

## 8. Testing

- Jest is configured with `ts-jest`, coverage collection, and an e2e config in `test/`.
- Only one test file exists: `app.controller.spec.ts`.

> [!CAUTION]
> **Test coverage is essentially zero.** The auth flows, notification fan-out, WebSocket lifecycle, Prisma error handling, and response interceptor are all untested. At minimum, unit-test the `AuthService` (register, login, Google flow) and `NotificationsService` (create + WS emit). These are the highest-risk code paths.

---

## 9. Minor Nits

| File                                                                                                                 | Issue                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [register-credentail.dto.ts](file:///home/khunbai/1-devs/14-nestjs-home345/src/auth/dtos/register-credentail.dto.ts) | Filename typo: `credentail` → `credential`                                                                                                    |
| [s3/](file:///home/khunbai/1-devs/14-nestjs-home345/src/modules/s3)                                                  | Lives under `modules/` but behaves more like infrastructure (`core/`). If other modules depend on it for uploads, it might belong in `core/`. |
| `public.module.ts`                                                                                                   | Has no service — only a controller. This is fine if it's just exposing public endpoints, but the module is nearly empty (~175 bytes).         |
| `package.json` version                                                                                               | Says `1.0.0` but `.env.example` also says `1.0.0` — these seem like they should be synced from a single source of truth.                      |

---

## 10. Summary Scorecard

| Category                  | Rating     | Comment                                           |
| ------------------------- | ---------- | ------------------------------------------------- |
| **Architecture**          | ⭐⭐⭐⭐⭐ | Clean separation, idiomatic NestJS                |
| **Security**              | ⭐⭐⭐⭐   | Solid JWT + OAuth; needs refresh tokens           |
| **Database Design**       | ⭐⭐⭐⭐⭐ | Well-indexed, proper types, polymorphic documents |
| **DX & Tooling**          | ⭐⭐⭐⭐   | Great env/script setup; add health checks         |
| **Documentation**         | ⭐⭐⭐⭐   | Good inline docs and markdown guides              |
| **Docker / Deploy**       | ⭐⭐⭐     | Works, but single-stage and no healthcheck        |
| **Testing**               | ⭐         | Essentially absent — highest priority gap         |
| **TypeScript Strictness** | ⭐⭐       | `strictNullChecks: false` undermines safety       |

**Overall: A well-architected starter that's strong on structure and DX. The two biggest wins to pursue would be enabling strict TypeScript and adding test coverage for the auth + notification paths.**
