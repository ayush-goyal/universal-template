---
name: nextjs-app
description: Build UI in the Next.js web app at apps/web. Covers App Router file layout, calling tRPC from server components versus client components, prefetch and hydration, auth-gating a route, shadcn/ui components, Tailwind v4, and date formatting with luxon. Use when adding or editing a page, route, layout, form, or React component under apps/web, or when wiring the web frontend to an API procedure.
paths:
  - "apps/web/**"
---

# Building pages in apps/web

`pnpm gen web-page` scaffolds a page, optionally auth-gated. Path alias `@/*` maps to `apps/web/*`.

## Which tRPC client

This is the decision that most often goes wrong. There are two, and they are not interchangeable.

**Server components** — import `trpc` from `@/trpc/server`. Prefetch on the server, then hydrate so
the client has the data without a second round trip:

```tsx
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export default async function Page() {
  prefetch(trpc.getUserCount.queryOptions());

  return (
    <HydrateClient>
      <UserCount />
    </HydrateClient>
  );
}
```

**Client components** — `"use client"`, then `useTRPC()` from `@/trpc/react` combined with TanStack
Query. `useTRPC()` returns an options proxy, not the data:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/react";

export function UserCount() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.getUserCount.queryOptions());
  return <p>{data}</p>;
}
```

For mutations: `useMutation(trpc.createThing.mutationOptions())`. For a streaming procedure you need
the raw client instead — `useTRPCClient()` and call `.mutate()` directly, as `app/page.tsx` does for
chat.

## Auth-gating a route

Do it in a `layout.tsx` so every child is covered, following `app/dashboard/layout.tsx`:

```tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return <ProtectedRouteRedirectHandler />;
```

Note it renders a redirect component rather than calling `redirect()`, which is what preserves the
intended destination across sign-in. Do not gate in a client component — the unauthenticated markup
ships to the browser first.

## Components and styling

- Use shadcn/ui from `@/components/ui`. Add new primitives with the shadcn CLI rather than writing
  them; config is in `components.json` (style `new-york`, base color `neutral`, RSC enabled).
- Tailwind v4. There is **no `tailwind.config.js`** — theme tokens live in CSS in `styles/globals.css`.
  Do not create a config file expecting it to be read.
- Shared layout pieces are in `@/components/layout`, brand marks in `@/components/logos`.
- `cn()` from `@/lib/utils` for conditional classes.
- Toasts use `sonner`.

## Dates

Use **luxon**, not `date-fns` or raw `Date` formatting.

```ts
import { DateTime } from "luxon";

DateTime.fromJSDate(createdAt).toLocaleString(DateTime.DATETIME_MED);
```

## Gotchas

- A page that calls `useTRPC()` without `"use client"` fails at build with an unclear error about
  hooks. Adding `"use client"` to a page that only prefetches is the opposite mistake: it forfeits
  server rendering.
- `@/trpc/server` is `server-only`. Importing it from a client component is a build error.
- Server-side env vars are read through `import { env } from "env"` (the validated schema), not
  `process.env` directly. Client-visible vars must be prefixed `NEXT_PUBLIC_`.
- Adding a page needs no route registration; the App Router is filesystem-based.
- The web app hosts the API. tRPC lives at `app/api/trpc/[trpc]/route.ts` and Better Auth at
  `app/api/auth/[...all]/route.ts` — don't add a parallel API route for something a procedure
  should do.
- Tests here are **Vitest** (`apps/web/__tests__/`), unlike the native app.
