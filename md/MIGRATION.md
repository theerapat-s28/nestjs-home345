# Migration Guide — Office Backend → Personal Project Foundation

This document records every change made when extracting the personal-use
foundation from the original office HR/project-management backend.

---

## What Was Removed

### Entire source modules (directories left on disk but no longer wired in)

The following `src/` directories still exist but are **no longer imported** by
`app.module.ts`. Delete them once you are confident you do not need them.

| Module directory                | Reason for removal                                                  |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/admin/`                    | HR admin sub-modules (departments, positions, leave-balances, etc.) |
| `src/employees/`                | Employee CRUD & hierarchy                                           |
| `src/employee-salaries/`        | Payroll                                                             |
| `src/employee-docs/`            | Employee document management                                        |
| `src/employee-bank-accounts/`   | Bank account management                                             |
| `src/employee-hierarchy/`       | Org-chart queries                                                   |
| `src/projects/`                 | Project management                                                  |
| `src/project-members/`          | Project team membership                                             |
| `src/project-vendors/`          | Project–vendor assignments                                          |
| `src/project-docs/`             | Project document management                                         |
| `src/project-financial/`        | Project financials                                                  |
| `src/project-installments/`     | Payment installment schedules                                       |
| `src/project-key-deliverables/` | Key deliverable tracking                                            |
| `src/project-type-assignments/` | Project type classification                                         |
| `src/clients/`                  | Client CRUD                                                         |
| `src/client-contact-persons/`   | Client contact management                                           |
| `src/client-docs/`              | Client document management                                          |
| `src/vendors/`                  | Vendor CRUD                                                         |
| `src/vendor-contact-persons/`   | Vendor contact management                                           |
| `src/vendor-bank-accounts/`     | Vendor bank account management                                      |
| `src/vendor-docs/`              | Vendor document management                                          |
| `src/vendor-fees/`              | Vendor fee agreements                                               |
| `src/vendor-fee-installments/`  | Vendor fee payment tracking                                         |
| `src/vendor-services/`          | Vendor service type assignments                                     |
| `src/service-types/`            | Service type catalogue                                              |
| `src/bank-accounts/`            | Generic bank account CRUD                                           |
| `src/contact-persons/`          | Generic contact person CRUD                                         |
| `src/documents/`                | Generic document CRUD (polymorphic links)                           |
| `src/tasks/`                    | Task state machine (open→in_progress→review→completed)              |
| `src/task-comment-docs/`        | Task comment documents                                              |
| `src/timesheet/`                | Timesheet CRUD + approval workflow                                  |
| `src/leaves/`                   | Leave request workflow                                              |
| `src/leave-balances/`           | Per-employee leave balance tracking                                 |
| `src/leave-docs/`               | Leave request documents                                             |
| `src/company-holidays/`         | Company-wide holiday calendar                                       |
| `src/events/`                   | Calendar events + participant status                                |

### S3 service methods removed

All entity-specific presigned URL helpers were consolidated into one generic
method:

| Removed method                      | Replaced by                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `getVendorDocumentPresignedUrl()`   | `getEntityDocumentPresignedUrl("vendors", vendorId, ...)`     |
| `getClientDocumentPresignedUrl()`   | `getEntityDocumentPresignedUrl("clients", clientId, ...)`     |
| `getEmployeeDocumentPresignedUrl()` | `getEntityDocumentPresignedUrl("employees", employeeId, ...)` |
| `getLeaveDocumentPresignedUrl()`    | `getEntityDocumentPresignedUrl("leave-docs", leaveId, ...)`   |
| `getProjectDocumentPresignedUrl()`  | `getEntityDocumentPresignedUrl("projects", projectId, ...)`   |
| `getTaskDocumentPresignedUrl()`     | `getEntityDocumentPresignedUrl("tasks", taskId, ...)`         |

S3 controller endpoints removed accordingly; replaced by `POST /api/s3/entity-doc-presigned`.

### Prisma schema — models removed

All 40+ office-specific models were removed. The following models remain:

- `User`
- `UserProfile`
- `Document`
- `DocumentLink`
- `Notification`
- `NotificationRecipient`

The following enums were removed: `VendorType`, `ClientType`, `ProjectStatus`,
`Religion`, `PermissionType`, `VendorAssignmentType`, `VendorFeeInstallmentStatus`,
`BankAccountEntityType`, `TimesheetStatus`, `LeaveStatus`, `LeaveDuration`,
`TaskStatus`, `TaskAction`, `EventStatus`.

`NotificationType` was simplified (removed `client_external`).

### Auth service — employee response fields removed

`formatUserResponse()` previously included employee-related fields:
`employeeId`, `position`, `positionCode`, `department`, `firstname`,
`lastname`, `supervisorId`. These are now removed. The auth response
contains only: `id`, `username`, `email`, `role`, `status`, `profileImageUrl`.

### tsconfig.json — aliases removed

Office-specific path aliases removed:
`@src-admin/*`, `@src-api-keys/*`, `@src-departments/*`,
`@src-module-permissions/*`, `@src-modules/*`, `@src-positions/*`,
`@src-projects/*`, `@src-vendors/*`, `@src-project-financial/*`,
`@src-project-installments/*`.

---

## What Was Added

### `src/items/` — Example feature module

A complete, working CRUD module demonstrating every architectural pattern:

```
src/items/
├── dtos/
│   ├── create-item.dto.ts   — validation with class-validator + Swagger
│   ├── update-item.dto.ts   — partial update DTO
│   └── query-item.dto.ts    — pagination + search query params
├── items.controller.ts      — REST controller (JWT-protected, ownership-aware)
├── items.service.ts         — Prisma CRUD, soft-delete, role-based access
└── items.module.ts          — NestJS module declaration
```

**To activate the Items module:**

1. Uncomment the `Item` model in `prisma/schema.prisma`
2. Run `pnpm migrate:dev` to create the `items` table
3. Uncomment the `ItemsModule` import in `src/app.module.ts`

### `src/s3/dto/get-entity-doc-url.dto.ts` — Generic entity doc upload DTO

Replaces all the entity-specific S3 DTOs.

---

## What Was Preserved (Unchanged)

| File / Directory                               | Purpose                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/prisma/`                             | PrismaService with pg adapter, shutdown hooks                                                                                                |
| `src/core/websocket/`                          | WebsocketGateway + WebsocketService (JWT auth on connect, rooms by userId)                                                                   |
| `src/core/date/`                               | DateService (Bangkok TZ helpers)                                                                                                             |
| `src/core/interceptor/error.interceptor.ts`    | Global Prisma → HTTP exception mapping                                                                                                       |
| `src/core/interceptor/response.interceptor.ts` | Unified response envelope + Decimal→Number transform                                                                                         |
| `src/auth/`                                    | JWT strategy, Google OAuth, guards, decorators                                                                                               |
| `src/users/`                                   | Admin-only user CRUD                                                                                                                         |
| `src/user-profiles/`                           | User profile CRUD                                                                                                                            |
| `src/notifications/`                           | Real-time notifications (WebSocket + DB)                                                                                                     |
| `src/s3/s3.service.ts`                         | `getPresignedUrl`, `getEntityDocumentPresignedUrl`, `getProfileImagePresignedUrl`, `getSandboxImagePresignedUrl`, `getFileUrl`, `deleteFile` |
| `src/public/`                                  | `/api/version` and `/api/prisma-schema` endpoints                                                                                            |
| `src/utils/`                                   | `prisma-error.ts`, `password.util.ts`, `object.util.ts`, `api-key.util.ts`                                                                   |
| `prisma.config.ts`                             | Prisma CLI config                                                                                                                            |
| `nest-cli.json`                                | NestJS CLI config                                                                                                                            |
| `tsconfig.json`                                | Compiler options + core path aliases                                                                                                         |
| `Dockerfile`                                   | Node 22 + pnpm build                                                                                                                         |
| `docker-compose.yml`                           | Single backend service                                                                                                                       |

---

## How to Add a New Personal Feature Module

Follow the **Items** module as a template:

```
Step 1 — Add a Prisma model
  prisma/schema.prisma → add model MyFeature { ... @@map("my_features") }
  pnpm migrate:dev

Step 2 — Create the module directory
  src/my-feature/
    dtos/create-my-feature.dto.ts
    dtos/update-my-feature.dto.ts
    dtos/query-my-feature.dto.ts
    my-feature.service.ts
    my-feature.controller.ts
    my-feature.module.ts

Step 3 — Register in app.module.ts
  import { MyFeatureModule } from "./my-feature/my-feature.module";
  // add to imports array under "Personal Project Features"

Step 4 — (Optional) Add a tsconfig alias
  tsconfig.json → "@src-my-feature/*": ["src/my-feature/*"]
```

### Standard patterns to follow

- **Services** call `handlePrismaError(error)` inside all `try/catch` blocks.
- **Paginated lists** return `{ data, meta: { totalRecords, limit, offset } }` so
  `ResponseInterceptor` auto-formats the pagination envelope.
- **Soft-deletes** set `deletedAt = new Date()` and all queries include
  `where: { deletedAt: null }`.
- **Auth** is enforced globally; use `@Public()` for public endpoints, `@Admin()`
  for admin-only, `@Roles(Role.xxx)` for custom roles.
- **WebSocket notifications** use `WebsocketService.sendToUser(userId, event, data)`.

---

## Environment Variables Added / Changed

| Variable       | Change                                                     |
| -------------- | ---------------------------------------------------------- |
| `APP_NAME`     | **New** — display name in Swagger UI and logs              |
| `DATABASE_URL` | Default DB name changed from `formstr_db` to `personal_db` |
| All others     | Unchanged                                                  |
