# AGENTS.md

## Cursor Cloud specific instructions

### Environment

Cloud Agent environment is defined in `.cursor/environment.json` + `.cursor/Dockerfile`.
The Dockerfile is based on `node:22-bookworm-slim` (Node.js 22 + corepack preinstalled) and adds pnpm 10.6.3 and PostgreSQL 16 (from the upstream PGDG apt repo). Docker-in-Docker is intentionally *not* installed — no dev workflow in this repo needs it (the `apps/server` image is built by GitHub Actions, not the agent). If a future task needs it, follow the DinD recipe in the [Cursor docs](https://cursor.com/docs/cloud-agent/setup#running-docker).

The `install` script runs `.cursor/setup-env.sh` (creates `.env` from `.env.example` if absent), starts PostgreSQL, creates the database, runs `pnpm install`, and applies Prisma migrations with `prisma migrate deploy` (non-interactive, idempotent). The `start` command ensures PostgreSQL is running. The `terminals` section auto-starts the web and server dev processes.

### Services

| Service | Command | Port |
|---|---|---|
| Web app (Next.js) | `pnpm --filter @acme/web dev` | 3000 |
| API server (Express) | `pnpm --filter @acme/server dev` | 3001 |
| Prisma Studio | `pnpm --filter @acme/db db:studio` | 5555 |

The web app is the primary service — it hosts both the frontend, tRPC API (`/api/trpc`), and Better Auth (`/api/auth`). The Express server is secondary (health check at `/health`). Both are auto-started via `terminals` in `environment.json`.

### .env setup

Handled automatically by `.cursor/setup-env.sh` during `install`. If you need to recreate it manually: `bash .cursor/setup-env.sh`.

Key gotchas:
- `.env.example` already has optional vars commented out and `RESEND_API_KEY` set, so `cp .env.example .env` is all you need (the setup script also sets `DATABASE_URL` for the local PostgreSQL).
- `.env` must exist before `pnpm install` because the `@acme/db` postinstall hook runs `prisma generate` which reads `DATABASE_URL`.
- If you add new optional URL-typed env vars, keep them commented out in `.env.example` — `@t3-oss/env-nextjs` rejects empty strings for URL fields.

### Database

PostgreSQL 16 runs locally (started by `start` command). Migrations:
```bash
pnpm --filter @acme/db db:migrate
```

### Quality checks

```bash
pnpm lint       # 0 errors, 0 warnings expected
pnpm typecheck  # 0 errors across all 11 packages expected
pnpm format     # Prettier
```

Always run `pnpm lint` and `pnpm typecheck` before committing. A pre-commit hook runs `lint-staged` automatically.

### Reference

Standard dev commands are documented in `CLAUDE.md` and `README.md`.
