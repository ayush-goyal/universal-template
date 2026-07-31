---
name: prisma-schema
description: Change the database schema in packages/db and generate a migration. Covers editing schema.prisma, the migrate workflow and its env requirements, the generated client location, the Better Auth table conventions, and exposing new models to the API. Use when adding or altering a model, field, index, relation, or enum, when running a migration, or when a Prisma type or model is missing from an import.
paths:
  - "packages/db/**"
---

# Changing the database schema

One schema file, `packages/db/prisma/schema.prisma`. Do not split it.

```bash
# 1. edit schema.prisma
pnpm --filter @acme/db db:migrate   # 2. create + apply (prompts for a name)
pnpm verify                         # 3. typecheck picks up the regenerated client
```

Never hand-write files in `prisma/migrations/`; `db:migrate` generates them. Never run
`prisma migrate reset` — it drops all data.

`db:migrate` runs through `dotenv -e ../../.env`, so **the root `.env` must exist with
`DATABASE_URL`** or it fails with a confusing datasource error. Create it with
`bash .cursor/setup-env.sh`.

## Conventions in this schema

Most tables are owned by Better Auth's Prisma adapter and follow its expectations rather than typical
Prisma style. Copy the **application-owned** `Device` model, not the auth models:

- `PascalCase` model, lowercase table via `@@map` — always add it. Auth tables are singular
  (`@@map("user")`) because Better Auth requires it; application tables are plural
  (`@@map("devices")`).
- `String @id @default(uuid())`. Auth models use a bare `String @id` because Better Auth generates
  the id; do not copy that.
- `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`. Auth models use plain
  required `DateTime` for both, again because Better Auth sets them.
- Relations carry an explicit `userId` scalar plus a relation field, `onDelete: Cascade` when a row is
  meaningless without its parent, and a matching back-reference on `User` (Prisma errors at validate
  time without it).
- Composite `@@id` when that is the real constraint, as `Device` does with `@@id([userId, fcmToken])`.

Existing models: `User`, `Device`, `Session`, `Account`, `Verification`, `Subscription`, plus the
`DevicePlatform` enum. All but `User` and `Device` are Better Auth's (`Subscription` via its Stripe
plugin) — add your own model rather than repurposing their fields. `User` is safe to extend with
optional fields.

## Using new models

`packages/db/src/index.ts` re-exports the whole generated client, so types and enums come from
`@acme/db` alongside the client instance:

```ts
import type { User } from "@acme/db";
import { db, DevicePlatform } from "@acme/db";
```

Never import from `@prisma/client` or reach into `prisma/generated/*` directly.

## Gotchas

- The client generates to `packages/db/prisma/generated/client`, which is gitignored and rebuilt by
  `postinstall`. A missing Prisma type usually means "run `pnpm install`", not "the model is wrong".
- `postinstall` also runs `prisma format`, so the schema gets reformatted. Re-read it before assuming
  your edit was lost.
- The `datasource` block declares no `url`; it resolves from the environment, which is why every
  Prisma command here goes through `pnpm with-env`. A bare `npx prisma ...` will not see the root
  `.env`.
- `packages/api` mocks `@acme/db` wholesale, so adding a model breaks nothing — but a procedure using
  a new model needs that model's methods added to the mock, or the test fails with "cannot read
  properties of undefined".
