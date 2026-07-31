---
name: env-vars
description: Add, validate, or debug an environment variable across this monorepo. Covers the single .env at the repo root, documenting it in .env.example, the t3-env schema in apps/web/env.ts, server versus NEXT_PUBLIC client vars, and Turborepo cache implications. Use when introducing a new secret or config value, wiring up an API key, or diagnosing an "invalid environment variables" error, an undefined process.env value, or a var that works locally but not in CI or a deployed build.
---

# Adding an environment variable

There is **one** `.env`, at the repo root. No app or package has its own. Every consumer either reads
`process.env` directly or, in the web app, goes through the validated `env` object.

## Checklist

1. **Document it in `.env.example`.** This is the contract for humans, CI, and
   `.cursor/setup-env.sh`, which copies the file verbatim when no `.env` exists. A var that is not in
   `.env.example` does not exist as far as a fresh clone is concerned.
2. **Add it to your local `.env`.**
3. **If `apps/web` reads it, add it to `apps/web/env.ts`** in three places — the `server` or `client`
   block, and `runtimeEnv`. Missing the `runtimeEnv` entry is the most common mistake; the var
   silently reads as `undefined` in edge and client bundles even though the schema declares it.
4. **If it is needed at build time in CI or production**, add it to the deploy environment too
   (`.github/workflows/`, the Coolify or Vercel project settings, `.cursor/environment.json`).

## Which block in `apps/web/env.ts`

| Where it is read                        | Block    | Naming                                 |
| --------------------------------------- | -------- | -------------------------------------- |
| Server components, route handlers, tRPC | `server` | any name                               |
| Client components, browser code         | `client` | must be prefixed `NEXT_PUBLIC_`        |
| Both, and safe to expose                | `shared` | `NEXT_PUBLIC_` if the browser needs it |

Anything in `client` or `shared` is inlined into the JavaScript bundle and is public. Never put a
secret there.

Prefer `.optional()` on a schema entry unless the app genuinely cannot boot without the value — a
required entry breaks every `pnpm dev` for anyone who has not set it. Guard optional values at the
call site instead of forcing them on everyone.

## Outside `apps/web`

`apps/web/env.ts` is the only t3-env schema in the repo. `packages/auth`, `packages/api`,
`packages/db`, and `apps/server` read `process.env` directly, and `apps/native` uses Expo's own
`EXPO_PUBLIC_`-prefixed mechanism. Do not import `apps/web/env.ts` from a package — it is
Next.js-specific and would invert the dependency direction. Validate at the point of use:

```ts
const key = process.env.SOME_API_KEY;
if (!key) throw new Error("SOME_API_KEY is not set");
```

Prisma commands in `packages/db` reach the root `.env` through `pnpm with-env`
(`dotenv -e ../../.env --`), not through any framework loader.

## Gotchas

- **`@t3-oss/env-nextjs` rejects empty strings for `.url()` fields.** An entry like `SENTRY_DSN=` is
  worse than absent. Keep unused URL-typed vars commented out in `.env.example`.
- **`.env` must exist before `pnpm install`**, because `@acme/db`'s `postinstall` runs
  `prisma generate` through `with-env`. Run `bash .cursor/setup-env.sh` first on a fresh clone.
- **Validation is skipped when `CI` is set** and during `lint` (see `skipValidation` in `env.ts`), so
  a broken schema will not surface in CI — it surfaces in a real build or at runtime.
- **The root `.env` is hashed, ambient variables are not.** `turbo.json` declares
  `globalDependencies: [".env"]`, so editing `.env` correctly invalidates every task. But it also sets
  `envMode: "loose"`, which forwards the whole process environment to tasks without making it part of
  the cache key. A variable exported in your shell or injected by CI or the deploy platform is
  therefore invisible to the hash, and a `build` can return a cached artifact with the old value baked
  in. Re-run with `--force` when you change one of those.
- The comment at the top of `.env.example` refers to `/src/env.js`, which does not exist. The real
  schema is `apps/web/env.ts`.
