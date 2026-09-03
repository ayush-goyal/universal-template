---
name: env-vars
description: Add, validate, or debug an environment variable across this monorepo. Covers the single root .env, documenting it in .env.example, the t3-env schema in apps/web/env.ts, server versus NEXT_PUBLIC vars, and Turborepo cache implications. Use when introducing a secret or config value, wiring up an API key, or diagnosing an "invalid environment variables" error, an undefined process.env value, or a var that works locally but not in CI or a deployed build.
---

# Adding an environment variable

**One** `.env`, at the repo root; no app or package has its own. Consumers read `process.env`
directly, except the web app, which goes through a validated `env` object.

## Checklist

1. **Document it in `.env.example`** — the contract for humans, CI, and `.cursor/setup-env.sh`, which
   copies the file verbatim when no `.env` exists. A var missing here does not exist to a fresh clone.
2. **Add it to your local `.env`.**
3. **If `apps/web` reads it, add it to `apps/web/env.ts` twice** — the `server` or `client` block,
   _and_ `runtimeEnv`. Forgetting `runtimeEnv` is the most common mistake: the var reads as
   `undefined` in edge and client bundles even though the schema declares it.
4. **If it is needed at build time**, add it to the deploy environment too (`.github/workflows/`,
   Cloudflare Worker secrets, another host's project settings, or `.cursor/environment.json`).

## Which block in `apps/web/env.ts`

| Where it is read                        | Block    | Naming                                 |
| --------------------------------------- | -------- | -------------------------------------- |
| Server components, route handlers, tRPC | `server` | any name                               |
| Client components, browser code         | `client` | must be prefixed `NEXT_PUBLIC_`        |
| Both, and safe to expose                | `shared` | `NEXT_PUBLIC_` if the browser needs it |

Anything in `client` or `shared` is inlined into the bundle and is public. Never put a secret there.

Prefer `.optional()` unless the app genuinely cannot boot without the value — a required entry breaks
`pnpm dev` for everyone who has not set it. Guard at the call site instead.

## Outside apps/web

`apps/web/env.ts` is the only t3-env schema in the repo. `packages/auth`, `packages/api`,
`packages/db`, and `apps/server` read `process.env` directly; `apps/native` uses Expo's
`EXPO_PUBLIC_` mechanism. Do not import `apps/web/env.ts` from a package — it is Next.js-specific and
inverts the dependency direction. Validate at the point of use:

```ts
const key = process.env.SOME_API_KEY;
if (!key) throw new Error("SOME_API_KEY is not set");
```

Prisma commands in `packages/db` reach the root `.env` through `pnpm with-env`
(`dotenv -e ../../.env --`), not a framework loader.

## Gotchas

- **`@t3-oss/env-nextjs` rejects empty strings for `.url()` fields.** `SENTRY_DSN=` is worse than
  absent, so keep unused URL-typed vars commented out in `.env.example`.
- **Prisma generation does not need database credentials.** `@acme/db` runs bare `prisma generate`
  during postinstall; migration and Studio commands load the root `.env` through `with-env`.
- **Validation is skipped only when `SKIP_ENV_VALIDATION` is set** and during `lint`
  (`skipValidation` in `env.ts`). CI uses the flag only for Worker bundle diagnostics that cannot
  access production secrets.
- **The root `.env` is hashed, ambient variables are not.** `turbo.json` sets
  `globalDependencies: [".env"]`, so editing it invalidates every task — but `envMode: "loose"`
  forwards the whole process environment without making it part of the cache key. A variable exported
  in your shell or injected by CI is invisible to the hash, so a `build` can return a cached artifact
  with the old value baked in. Re-run with `--force` after changing one.
