---
name: trpc-procedures
description: Add, change, or test a tRPC procedure in packages/api. Covers the one-file-per-procedure layout, registering it in root.ts, publicProcedure versus protectedProcedure, Zod input schemas, streaming procedures, and the mocked-database test pattern. Use when creating or editing an API endpoint, procedure, query, or mutation, when a client reports that a procedure does not exist, or when working anywhere under packages/api.
paths:
  - "packages/api/**"
---

# Adding a tRPC procedure

One file per procedure in `packages/api/src/routes/`, default-exporting a single procedure. No nested
sub-routers. The filename is the name a client calls: `routes/getUserCount.ts` → `trpc.getUserCount`.

## Steps

`pnpm gen trpc-route` does steps 1 and 2 and stubs 4. By hand, in order:

1. Create `packages/api/src/routes/<name>.ts` with a default-exported procedure.
2. **Register it in `packages/api/src/root.ts`** — import it and add the key to `createTRPCRouter`.
   The single most common mistake: the file compiles, `pnpm typecheck` passes, and the procedure is
   simply absent at runtime with a confusing client-side type error.
3. Import `db` from `@acme/db`, never a Prisma client you construct.
4. Add tests to `packages/api/src/__tests__/router.test.ts`.
5. Run `pnpm verify`.

## Choosing a procedure type

Import from `../trpc`.

- `protectedProcedure` — **the default.** Throws `UNAUTHORIZED` before your handler runs and narrows
  `ctx.user` and `ctx.session` to non-null, so `ctx.user.id` needs no guard.
- `publicProcedure` — only genuinely unauthenticated data; `ctx.user` may be `null`. Anything that
  costs money per call (an LLM, an SMS, a third-party API) must not be public.

## Shape to follow

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@acme/db";

import { protectedProcedure } from "../trpc";

const CreateThingInputSchema = z.object({
  name: z.string().min(1),
});

export default protectedProcedure.input(CreateThingInputSchema).mutation(async ({ ctx, input }) => {
  const count = await db.thing.count({ where: { userId: ctx.user.id } });
  if (count > 10) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You have too many things." });
  }

  return db.thing.create({
    data: { userId: ctx.user.id, name: input.name },
  });
});
```

`.query()` for reads, `.mutation()` for writes. Throw `TRPCError` with an explicit `code` for expected
failures; do not return error objects.

## Testing

Tests call procedures through `createCaller`, with no HTTP layer. `router.test.ts` already mocks
`@acme/db` and `@acme/auth` and provides `createAuthedContext()` / `createUnauthContext()`. Extend
the `@acme/db` mock with the model methods your procedure touches:

```ts
describe("createThing", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = createCaller(await createUnauthContext());
    await expect(caller.createThing({ name: "x" })).rejects.toThrow(TRPCError);
  });

  it("creates when authenticated", async () => {
    const caller = createCaller(await createAuthedContext());
    expect(await caller.createThing({ name: "x" })).toEqual({ id: "thing-1" });
  });
});
```

Every `protectedProcedure` gets the unauthenticated-rejection test — it is the only thing between a
typo in the procedure type and an open endpoint. Run `pnpm --filter @acme/api test`.

## Streaming procedures

Make the mutation an `async function*` and `yield` chunks; `routes/chat.ts` is the working example.
Two non-obvious requirements:

- Accept `signal`, pass it to the upstream call, and `cancel()` the reader in `finally`. Otherwise a
  client disconnecting mid-stream leaves the model call running and billing.
- The web client must use `httpBatchStreamLink` (already set in `apps/web/trpc/react.tsx`); a plain
  `httpBatchLink` buffers the whole response.

## Gotchas

- A procedure not listed in `root.ts` does not exist, and neither `lint` nor `typecheck` catches it.
  Grep `root.ts` before assuming a client bug.
- `ctx.user` is `User | null` on `publicProcedure` even when someone is signed in.
- Import types and enums from `@acme/db`, not `@prisma/client`. The generated client lives at
  `packages/db/prisma/generated/client` and is re-exported through `@acme/db`.
- Serialization is SuperJSON everywhere, so `Date` and `Map` survive the wire — no stringifying.
- `packages/api` has no env validation. `OPENAI_API_KEY` and friends are read straight from
  `process.env` and will be `undefined` rather than a startup error.
- No change is needed in `apps/web/app/api/trpc/[trpc]/route.ts`; it mounts the whole `appRouter`.
