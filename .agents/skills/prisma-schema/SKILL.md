---
name: prisma-schema
description: Change the database schema in packages/db and generate a migration. Covers editing schema.prisma, the migrate workflow and its env requirements, the generated client location, naming conventions used by the Better Auth tables, and how to expose new models to the API. Use when adding or altering a model, field, index, relation, or enum, when running a database migration, or when a Prisma type or model is missing from an import.
paths:
  - "packages/db/**"
---

# Changing the database schema

Schema lives at `packages/db/prisma/schema.prisma`. There is exactly one schema file; do not split it.

## Workflow

```bash
# 1. edit packages/db/prisma/schema.prisma
# 2. create and apply the migration (interactive: it prompts for a name)
pnpm --filter @acme/db db:migrate
# 3. typecheck picks up the regenerated client
pnpm verify
```

Never hand-write files in `packages/db/prisma/migrations/` — `db:migrate` generates them. Never run
`prisma migrate reset`; it drops all data.

`db:migrate` runs through `dotenv -e ../../.env`, so **the root `.env` must exist and contain
`DATABASE_URL`** or the command fails with a confusing datasource error. Create it with
`bash .cursor/setup-env.sh`.

## Conventions in this schema

Most tables are owned by Better Auth's Prisma adapter, so they follow its expectations rather than
typical Prisma style. Copy the **application-owned** `Device` model, not the auth models:

- `PascalCase` model name mapped to a lowercase table name with `@@map`. Auth tables are singular
  (`@@map("user")`) because Better Auth requires it; application tables are plural
  (`@@map("devices")`). Always add `@@map`.
- Primary key `String @id @default(uuid())`. The auth models declare a bare `String @id` because
  Better Auth generates the id itself — do not copy that.
- `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` so the database manages
  timestamps. The auth models have plain required `DateTime` for both, again because Better Auth
  sets them.
- Relations carry an explicit `userId` scalar plus a relation field, with `onDelete: Cascade` when a
  row is meaningless without its parent, and a matching back-reference on `User`. Prisma errors at
  validate time if you forget the back-reference.
- Use a composite `@@id` when that is the real constraint, as `Device` does with
  `@@id([userId, fcmToken])`.

Existing models are `User`, `Device`, `Session`, `Account`, `Verification`, and `Subscription`, plus
the `DevicePlatform` enum. `Session`, `Account`, `Verification`, and `Subscription` are Better Auth's
(the last via its Stripe plugin) — do not repurpose their fields for application needs, add your own
model instead. `User` is safe to extend with new optional fields.

## Using new models

`packages/db/src/index.ts` re-exports the whole generated client, so model types and enums come from
`@acme/db` alongside the client instance:

```ts
import type { User } from "@acme/db";
import { db, DevicePlatform } from "@acme/db";
```

Never import from `@prisma/client` and never reach into `packages/db/prisma/generated/*` directly.

## Gotchas

- The client is generated to `packages/db/prisma/generated/client`, which is gitignored (`generated/`
  in `.gitignore`). It is rebuilt by `postinstall`, so a missing Prisma type usually means "run
  `pnpm install`" rather than "the model is wrong".
- `postinstall` also runs `prisma format`, so the schema file gets reformatted. Re-read it before
  assuming your edit was lost.
- The `datasource` block declares no `url`. It resolves from the environment at runtime, which is why
  every Prisma command in this package goes through `pnpm with-env`. Running bare `npx prisma ...`
  from the package directory will not see the root `.env`.
- Tests in `packages/api` mock `@acme/db` wholesale, so adding a model does not break them — but a
  procedure that uses a new model needs that model's methods added to the mock, or the test fails
  with "cannot read properties of undefined".
