# Claude Code Instructions

## Environment

- **Dev env file**: `.env.development`
- **Prod env file**: `.env.production`
- All `prisma` and `npm` commands below use `dotenv` to inject the correct env file automatically.

---

## Database Commands

### Migrate

```bash
# Development — interactive, creates + applies new migration
npm run migrate:dev

# Production — applies existing migrations only (no interactive prompt)
npm run migrate:prod
```

> When creating a migration that renames a table or column, always use `--create-only` first,
> manually edit the generated SQL to use `ALTER TABLE ... RENAME TO ...`, then run deploy.
> Since `migrate:dev` is interactive, in non-TTY environments create the migration SQL file manually
> and apply with `migrate:prod` (which runs `prisma migrate deploy`).

### Generate Prisma Client

Run this after any schema change to regenerate the TypeScript client:

```bash
npm run generate:dev   # development
npm run generate:prod  # production
```

### Check Migration Status

```bash
npm run status:dev   # development
npm run status:prod  # production
```

### Validate Schema

```bash
npm run validate:dev   # development
npm run validate:prod  # production
```

---

## Application Commands

```bash
npm run start        # Dev server with watch (NODE_ENV=development)
npm run start:dev    # Same as above
npm run start:prod   # Production build runner
npm run build        # Compile TypeScript via NestJS
```

---

## Code Quality

```bash
npm run format   # Prettier — formats src/ and test/
npm run lint     # ESLint with auto-fix
```

---

## Tests

```bash
npm run test          # Run all unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # End-to-end tests
```

---

## Docker

```bash
npm run docker   # Tear down and rebuild containers
```

---

## Port Management

```bash
npm run kill      # Kill process on port 3000
npm run kill:dev  # Kill process on port 5000
```

---

## Migration Workflow (Safe Pattern)

When making schema changes:

1. Edit `prisma/schema.prisma`
2. **For additive changes** (new column with DEFAULT, new table): run `npm run migrate:dev`, enter a migration name when prompted
3. **For renames** (table or column): manually create `prisma/migrations/<timestamp>_<name>/migration.sql` with `ALTER TABLE ... RENAME TO ...`, then run `npm run migrate:prod`
4. Regenerate the client: `npm run generate:dev`
5. Restart the dev server: `npm run start:dev`
