# AGENTS.md

## Cursor Cloud specific instructions

### Environment

Cloud Agent environment is defined in `.cursor/environment.json` + `.cursor/Dockerfile`.
The Dockerfile installs Node.js 22, pnpm 10.6.3, PostgreSQL 16, and Docker (with fuse-overlayfs/iptables-legacy for nested containers).

The `install` script runs `.cursor/setup-env.sh` (creates `.env` from `.env.example` if absent), starts PostgreSQL, creates the database, runs `pnpm install`, and applies Prisma migrations. The `start` command ensures PostgreSQL and Docker are running. The `terminals` section auto-starts the web and server dev processes.

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
- Optional env vars (Sentry DSN, PostHog key, Google credentials) **must be commented out**, not empty strings — `@t3-oss/env-nextjs` rejects empty strings for URL-typed fields.
- `RESEND_API_KEY` must be set (even `re_123` for dev) — without it, auth pages throw runtime errors.
- `.env` must exist before `pnpm install` because the `@acme/db` postinstall hook runs `prisma generate` which reads `DATABASE_URL`.

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

### Dev Containers (alternative local setup)

A Docker Compose devcontainer setup is also available in `.devcontainer/`. See `.devcontainer/devcontainer.json` for VS Code / Cursor Dev Containers usage.

### Reference

Standard dev commands are documented in `CLAUDE.md` and `README.md`.
