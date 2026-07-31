---
name: verify-web
description: Check web UI behaviour in a real browser with the Playwright MCP server — navigate, snapshot the page, click and type, then read console and network output. Use after changing anything under apps/web that renders or handles input, when reproducing a UI bug, or when asked whether a page actually works rather than whether it compiles.
paths:
  - "apps/web/**"
---

# Verifying web changes in a browser

`pnpm verify` (see `verify-changes`) proves the code compiles. It says nothing about whether the page
renders, the form submits, or the query returns. The `playwright` MCP server is the other gate.

Start the app first and leave it running: `pnpm --filter @acme/web dev` → http://localhost:3000. A
`net::ERR_CONNECTION_REFUSED` almost always means you raced the server, not that you broke the app.

## The loop

1. `browser_navigate` to the page.
2. `browser_snapshot` — the accessibility tree, not a picture. Prefer it: it is text you can assert
   against, and every element comes back with a `ref` to act on.
3. Act with `browser_click`, `browser_type`, or `browser_fill_form`, addressing elements by `ref`.
4. Snapshot again to confirm the state changed the way you predicted.
5. `browser_console_messages` and `browser_network_requests` before concluding anything.

Use `browser_take_screenshot` only when the question is genuinely visual — spacing, colour, dark
mode, overflow. It costs far more context than a snapshot and cannot be diffed.

## What to check

- **Console.** Hydration mismatches and `useTRPC()` misuse surface only here; a page can look correct
  and still log a hydration error.
- **Network.** tRPC goes to `/api/trpc/...` in this same app, so a 500 is an API bug — read the
  procedure's stack trace in the dev server terminal.
- **Auth-gated routes.** Anything under `app/dashboard/` needs a session. Sign in through the UI, or
  verify the unauthenticated case: the layout renders a redirect component rather than calling
  `redirect()`, so expect a client-side bounce that preserves the intended destination.
- **Streaming.** The chat on `app/page.tsx` uses the raw tRPC client, so watch the network entry
  rather than expecting a single settled response.

## Gotchas

- `pnpm dev` uses `turbo watch`, which does **not** typecheck. Both gates, always.
- Port 3000 in use means a dev server is already running. Reuse it.
- The browser session is real and persistent: cookies and auth survive navigations, which is handy
  for multi-step flows and misleading when you meant to test a cold visit. Clear state explicitly.
- Do not add Playwright test files. This is exploratory; automated web tests are Vitest under
  `apps/web/__tests__/`.
