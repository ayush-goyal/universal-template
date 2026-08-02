# AGENTS.md

The only always-loaded instruction file. Area conventions live in skills under `.agents/skills/`,
loaded on demand — do not duplicate them here. Never state a dependency version here; read
`package.json`.

## What this is

A Turborepo + pnpm monorepo sharing one tRPC API between a web app and a React Native app. All
packages are namespaced `@acme/*`; use that prefix in imports and `--filter` commands.

- `apps/web` — Next.js App Router. **Primary service**: frontend, tRPC at `/api/trpc`, Better Auth
  at `/api/auth`.
- `apps/native` — Expo React Native (dev client, not Expo Go).
- `apps/server` — Express + tRPC. Secondary; only `/health` matters today.
- `packages/api` — tRPC routers, one file per procedure.
- `packages/auth` — Better Auth config, shared by web and native.
- `packages/billing` — entitlements, usage metering, the RevenueCat webhook. Server-only.
- `packages/db` — Prisma client and migrations.
- `packages/shared` — the plan catalog and shared types. Dependency-free; bundled into the RN app.
- `.oxlintrc.json` — repo-wide Oxlint rules; `tooling/*` contains shared Prettier, TypeScript, and
  Vitest configs.

## Commands

```bash
pnpm install                        # always pnpm, never npm or yarn
pnpm dev                            # all apps
pnpm --filter @acme/web dev         # one app

pnpm verify                         # THE quality gate: autofix, then check
pnpm check                          # non-mutating, exactly what CI runs, affected packages only
pnpm verify:all                     # same as verify, ignoring affected detection

pnpm --filter @acme/db db:migrate   # apply a schema change
```

Run `pnpm verify` before claiming work is done, and `verify:all` after touching shared config. If
`check` fails twice on the same root cause, stop and report instead of guessing. `verify-changes`
covers reading its failures; `verify-web` and `verify-ios` cover whether the thing actually works.

## Hard rules

- Never commit secrets. `.env` is gitignored; `.env.example` is the contract.
- Never run `prisma migrate reset` or anything else that drops data.
- Never `git push --force`.
- Never edit `packages/db/prisma/generated/**`, `dist/`, `.next/`, or `.turbo/`.
- Never hand-edit `pnpm-lock.yaml`; change dependencies through pnpm.
- Shared dependency versions belong in the `catalog:` block of `pnpm-workspace.yaml`, not pinned per
  package.

## Environment

One `.env`, at the repo root. It must exist before `pnpm install`, because `@acme/db`'s postinstall
runs `prisma generate` — create it with `bash .cursor/setup-env.sh`. Adding a variable has a
checklist and several traps: see the `env-vars` skill.

`.cursor/environment.json` and `.cursor/Dockerfile` define the Cursor Cloud Agent box. `install`
seeds `.env`, starts PostgreSQL, installs, and migrates; web (3000) and server (3001) auto-start,
Prisma Studio is on 5555.

## Agent configuration

This repo follows the [Agent Skills](https://agentskills.io) standard and the `AGENTS.md`
convention, with no per-harness copies of anything.

- Instructions: this file
- Skills: `.agents/skills/<name>/SKILL.md`, read natively by Cursor and Codex, and by Claude Code
  through the `.claude/skills` symlink. A directory with `name` and `description` frontmatter, `name`
  matching the directory. The `description` is the only part loaded until the skill fires, so say
  what it does _and_ when to reach for it. `paths:` scopes a skill to a subtree; all three harnesses
  honour it.
- MCP servers: `.cursor/mcp.json`, which `.mcp.json` symlinks to for Claude Code, plus
  `.codex/config.toml` — the one thing duplicated, because Codex shares no MCP format.

Skills: `trpc-procedures`, `nextjs-app`, `expo-app`, `prisma-schema`, `billing`, `env-vars`,
`verify-changes`, `verify-web`, `verify-ios`. Extend one rather than adding repeated guidance here.

## MCP servers

The set is deliberately small: every enabled server's tools cost context on every request.

- `context7` — current docs for a dependency. Use it before writing against an API you have not
  verified; this stack moves faster than model priors.
- `shadcn` — browse the registry, read real component source. See `nextjs-app`.
- `playwright` — drive a browser against `localhost:3000`. See `verify-web`.
- `expo` — Expo docs, SDK-correct `expo install`, EAS logs, simulator screenshot and tap. See
  `verify-ios`.
- `XcodeBuildMCP` — `xcodebuild` and `simctl` for the native build itself, when Expo's own tooling
  cannot explain a failure. Requires Xcode locally. Also `verify-ios`.

There is no server for git, GitHub, or the database: `gh`, `psql`, and `db:studio` are better.
**Adding, renaming, or removing a server means editing both `.cursor/mcp.json` and
`.codex/config.toml`.** They differ beyond syntax — Cursor interpolates `${env:VAR}`, Claude Code
reads the same file but wants `${VAR}`, and Codex does not interpolate at all and inherits named
shell variables instead. See `.agents/README.md`.
