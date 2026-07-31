# AGENTS.md

Repo-wide instructions for coding agents, and the only always-loaded instruction file. Area-specific
conventions live in skills under `.agents/skills/`, which load on demand — do not duplicate them here.

Never state a dependency version in this file. Read `package.json` instead.

## What this is

A Turborepo + pnpm monorepo sharing one tRPC API between a web app and a React Native app.

- `apps/web` — Next.js App Router. **Primary service**: hosts the frontend, the tRPC API at
  `/api/trpc`, and Better Auth at `/api/auth`.
- `apps/native` — Expo React Native app (dev client, not Expo Go).
- `apps/server` — Express + tRPC. Secondary; only a `/health` check matters today.
- `packages/api` — tRPC routers and business logic. One file per procedure.
- `packages/auth` — Better Auth config, shared by web and native.
- `packages/db` — Prisma client and migrations.
- `packages/shared` — shared utilities and types.
- `tooling/*` — shared ESLint, Prettier, TypeScript, and Vitest configs.

All packages are namespaced `@acme/*`. Use that prefix in imports and `--filter` commands.

## Commands

```bash
pnpm install                        # always pnpm, never npm or yarn
pnpm dev                            # all apps
pnpm --filter @acme/web dev         # one app

pnpm verify                         # THE quality gate: autofix, then check
pnpm check                          # non-mutating: format + lint + typecheck + test, affected only
pnpm fix                            # autofix only: eslint --fix then prettier --write
pnpm verify:all                     # same as verify, ignoring affected detection

pnpm --filter @acme/db db:migrate   # apply a schema change
```

## The quality gate

Run `pnpm verify` before you claim work is done. It runs `pnpm fix` first so autofixable problems
never reach you as failures, then `pnpm check`.

`pnpm check` is exactly what CI runs. It resolves against changed packages only, so it is fast
enough to run repeatedly. Use `pnpm verify:all` when you have touched shared config.

If `check` fails twice on the same root cause, stop and report rather than continuing to guess.

## Hard rules

- Never commit secrets. `.env` is gitignored; `.env.example` is the documented contract.
- Never run `prisma migrate reset` or any command that drops data.
- Never `git push --force`.
- Never edit `packages/db/prisma/generated/**` or any `dist/`, `.next/`, or `.turbo/` directory.
- Never hand-edit `pnpm-lock.yaml`; change dependencies through pnpm.
- Dependency versions are centralized in the `catalog:` block of `pnpm-workspace.yaml`. Add shared
  versions there rather than pinning per package.

## Environment variables

A new variable must be added in three places or it will fail at runtime or at build:

1. `.env.example` — the documented contract.
2. `apps/web/env.ts` — the `server` or `client` schema.
3. `apps/web/env.ts` — the `runtimeEnv` map. Easy to forget; Next.js cannot destructure
   `process.env` in edge runtimes, so it must be listed explicitly.

Keep optional URL-typed variables **commented out** in `.env.example`. `@t3-oss/env-nextjs`
rejects empty strings for URL fields, so `FOO_URL=` breaks the build while an absent `FOO_URL`
is fine.

`.env` must exist before `pnpm install`, because `@acme/db`'s postinstall runs `prisma generate`,
which reads `DATABASE_URL`. Run `bash .cursor/setup-env.sh` to create it.

## Cloud environment

`.cursor/environment.json` and `.cursor/Dockerfile` define the Cursor Cloud Agent box: Node, pnpm,
PostgreSQL, and Docker. `install` seeds `.env`, starts PostgreSQL, installs, and migrates. The web
app (3000) and Express server (3001) auto-start as terminals. Prisma Studio is on 5555 via
`pnpm --filter @acme/db db:studio`.

## Agent configuration lives in one place

This repo follows the open [Agent Skills](https://agentskills.io) standard and the `AGENTS.md`
convention. There are no per-harness copies of anything.

- Instructions: this file, plus nothing else.
- Skills: `.agents/skills/<name>/SKILL.md`, the cross-client location read natively by Cursor,
  Codex, Gemini CLI, Amp, and others.

A skill is a directory holding a `SKILL.md` with `name` and `description` frontmatter, optionally
alongside `scripts/`, `references/`, and `assets/`. `name` must match the directory. Write the
`description` so it states both what the skill does and when to reach for it, since that line is the
only part loaded until the skill activates. Add `paths:` to scope one to a subtree.

Current skills: `trpc-procedures`, `nextjs-app`, `expo-app`, `prisma-schema`, `env-vars`,
`verify-changes`. Prefer extending one of these over adding repeated guidance to this file.
