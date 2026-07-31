---
name: trpc-procedures
description: Add, change, or test a tRPC procedure in packages/api. Covers the one-file-per-procedure layout, registering it in root.ts, choosing publicProcedure vs protectedProcedure, Zod input schemas, streaming procedures, and the mocked-database test pattern. Use when creating or editing an API endpoint, route, procedure, query, or mutation, when a client reports that a procedure does not exist, or when working anywhere under packages/api.
paths:
  - "packages/api/**"
---

# Adding a tRPC procedure

## Layout

One file per procedure in `packages/api/src/routes/`, default-exporting a single procedure. There
are no nested sub-routers. The filename is the procedure name a client calls.

```
packages/api/src/routes/getUserCount.ts   ->  trpc.getUserCount
packages/api/src/routes/createDevice.ts   ->  trpc.createDevice
```

## Steps

Prefer the generator, which performs steps 1 and 2 and stubs step 4:

```bash
pnpm gen trpc-route
```

Doing it by hand, in order:

1. Create `packages/api/src/routes/<name>.ts`. Default-export the procedure.
2. **Register it in `packages/api/src/root.ts`** — import it and add the key to `createTRPCRouter`.
   Skipping this is the single most common mistake: the file compiles, `pnpm typecheck` passes, and
   the procedure is simply absent at runtime with a confusing client-side type error.
3. Import `db` from `@acme/db`, never a Prisma client you construct yourself.
4. Add tests to `packages/api/src/__tests__/router.test.ts`.
5. Run `pnpm verify`.

## Choosing a procedure type

Import from `../trpc`.

- `protectedProcedure` — **the default choice.** Throws `UNAUTHORIZED` before your handler runs and
  narrows `ctx.user` and `ctx.session` to non-null, so `ctx.user.id` needs no guard.
- `publicProcedure` — only for genuinely unauthenticated data. `ctx.user` may be `null`. Anything
  that costs money per call (an LLM, an SMS, a third-party API) must not be public.

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

`.query()` for reads, `.mutation()` for writes. Throw `TRPCError` with an explicit `code` for
expected failures; do not return error objects.

## Testing

Tests call procedures directly through `createCaller` — there is no HTTP layer involved. The
existing file already mocks `@acme/db`, `@acme/auth`, and `firebase-admin/app` at the top and
provides `createAuthedContext()` / `createUnauthContext()` helpers. Extend the `@acme/db` mock with
the model methods your procedure touches, then:

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

Every `protectedProcedure` gets the unauthenticated-rejection test. It is the only thing standing
between a typo in the procedure type and an open endpoint.

Run with `pnpm --filter @acme/api test`.

## Streaming procedures

To stream, make the mutation an `async function*` and `yield` chunks. See `routes/chat.ts` for the
working example. Two non-obvious requirements:

- Accept `signal` in the handler args and pass it to the upstream call, then `cancel()` the reader
  in a `finally` block. Without this, a client disconnecting mid-stream leaves the model call
  running and billing.
- The web client must use `httpBatchStreamLink`, which `apps/web/trpc/react.tsx` already does.
  A plain `httpBatchLink` buffers the whole response and the stream never arrives incrementally.

## Gotchas

- A procedure not listed in `root.ts` does not exist, and nothing in `lint` or `typecheck` catches
  it. Grep `root.ts` before assuming a client bug.
- `ctx.user` is only non-null on `protectedProcedure`. On `publicProcedure` it is
  `User | null` even when someone is signed in.
- Import types and enums from `@acme/db`, not from `@prisma/client`. The generated client lives at
  `packages/db/prisma/generated/client` and is re-exported through `@acme/db`.
- Serialization is SuperJSON everywhere, so `Date` and `Map` survive the wire. You do not need to
  stringify dates.
- `packages/api` has no env-var validation of its own. A key like `OPENAI_API_KEY` is read straight
  from `process.env` at runtime and will be `undefined` rather than a startup error if missing.
- Adding a procedure needs no change to `apps/web/app/api/trpc/[trpc]/route.ts`; it already mounts
  the whole `appRouter`.
