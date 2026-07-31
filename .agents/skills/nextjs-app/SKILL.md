---
name: nextjs-app
description: Build UI in the Next.js web app at apps/web. Covers App Router layout, calling tRPC from server versus client components, prefetch and hydration, auth-gating a route, shadcn/ui, Tailwind v4, and luxon dates. Use when adding or editing a page, route, layout, form, or React component under apps/web, or when wiring the web frontend to an API procedure.
paths:
  - "apps/web/**"
---

# Building pages in apps/web

`pnpm gen web-page` scaffolds a page, optionally auth-gated. `@/*` maps to `apps/web/*`.

## Which tRPC client

The decision that most often goes wrong. The two are not interchangeable.

**Server components** — `trpc` from `@/trpc/server`. Prefetch, then hydrate so the client gets the
data without a second round trip:

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

**Client components** — `"use client"`, then `useTRPC()` from `@/trpc/react` with TanStack Query.
`useTRPC()` returns an options proxy, not the data:

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

Mutations: `useMutation(trpc.createThing.mutationOptions())`. A streaming procedure needs the raw
client instead — `useTRPCClient()` and `.mutate()`, as `app/page.tsx` does for chat.

## Auth-gating a route

In a `layout.tsx` so every child is covered, following `app/dashboard/layout.tsx`:

```tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return <ProtectedRouteRedirectHandler />;
```

It renders a redirect component rather than calling `redirect()`, which is what preserves the
intended destination across sign-in. Never gate in a client component — the unauthenticated markup
ships to the browser first.

## Components and styling

- shadcn/ui from `@/components/ui`. Add primitives with the shadcn CLI or the `shadcn` MCP server
  rather than by hand: the server lists what the registry actually has and returns the real source.
  Config in `components.json` (`new-york`, base `neutral`, RSC enabled).
- Tailwind v4: **no `tailwind.config.js`**. Theme tokens are CSS in `styles/globals.css`. Do not
  create a config file expecting it to be read.
- Layout pieces in `@/components/layout`, brand marks in `@/components/logos`, `cn()` from
  `@/lib/utils`, toasts via `sonner`.
- Dates use **luxon**, not `date-fns` or raw `Date`:
  `DateTime.fromJSDate(createdAt).toLocaleString(DateTime.DATETIME_MED)`.

## Gotchas

- `useTRPC()` without `"use client"` fails at build with an unclear error about hooks. `"use client"`
  on a page that only prefetches is the opposite mistake: it forfeits server rendering.
- `@/trpc/server` is `server-only`; importing it from a client component is a build error.
- Server env vars come from `import { env } from "env"` (the validated schema), not `process.env`.
  Client-visible vars must be prefixed `NEXT_PUBLIC_`.
- Adding a page needs no registration; the App Router is filesystem-based.
- This app hosts the API — tRPC at `app/api/trpc/[trpc]/route.ts`, Better Auth at
  `app/api/auth/[...all]/route.ts`. Don't add a parallel route for something a procedure should do.
- Tests here are **Vitest** (`apps/web/__tests__/`), unlike the native app.
