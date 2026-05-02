# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---|---|---|---|
| Web app (Next.js) | `pnpm --filter @acme/web dev` | 3000 | Hosts tRPC API (`/api/trpc`) and Better Auth (`/api/auth`) |
| API server (Express) | `pnpm --filter @acme/server dev` | 3001 | Standalone server with health check at `/health` |

The web app is the primary service — it hosts both the frontend and the API routes. The Express server is optional/secondary.

### Prerequisites before running services

- **PostgreSQL** must be running on port 5432. Start with `pg_ctlcluster 16 main start`.
- The database `expo-starter` must exist. Create with `su - postgres -c "createdb expo-starter"` if needed.
- A `.env` file must exist at the repo root (copy from `.env.example`). Key required values:
  - `DATABASE_URL` and `DATABASE_DIRECT_URL` pointing to the local PostgreSQL instance (use `postgresql://postgres:postgres@localhost:5432/expo-starter`)
  - `BETTER_AUTH_SECRET` (any long string)
  - `RESEND_API_KEY` must be set (even a dummy value like `re_123` works for dev) — without it the auth system throws a runtime error on sign-up/sign-in pages.
- Empty env vars for optional services (Sentry DSN, PostHog key, Google credentials) must be **commented out** rather than left as empty strings — the `@t3-oss/env-nextjs` validation rejects empty strings for URL-typed fields.

### Gotchas

- **`pnpm typecheck`** has a pre-existing `TS2688: Cannot find type definition file for 'minimatch'` error in `@acme/prettier-config`, `@acme/server`, and `@acme/auth`. This is caused by the `minimatch` package's type declarations leaking through hoisted `node_modules`. The core packages (`@acme/web`, `@acme/api`, `@acme/db`) typecheck cleanly.
- **Database migrations** must be run after creating the database: `pnpm --filter @acme/db db:migrate`.
- The `pnpm install` postinstall hook in `@acme/db` runs `prisma generate` and requires `DATABASE_URL` to be set, so the `.env` file should exist **before** running `pnpm install`.
- Standard dev commands are documented in `CLAUDE.md` and `README.md`.

### Dev Containers

A full devcontainer setup is available in `.devcontainer/`. It provides:

- **Docker Compose** with PostgreSQL 16 and a Node.js 22 dev container
- Automatic port forwarding for web (3000), API server (3001), and database (5432)
- A `post-create.sh` script that runs `pnpm install --force`, sets up `.env`, and runs migrations

To use: open the repo in VS Code / Cursor with the Dev Containers extension, or run `docker compose -f .devcontainer/docker-compose.yml up -d` then exec into the `app` container.

Inside the container, start services with the same commands as local development:
- `pnpm --filter @acme/web dev` (port 3000)
- `pnpm --filter @acme/server dev` (port 3001)

The compose file sets `DATABASE_URL` to point at the `db` service (`postgresql://postgres:postgres@db:5432/expo-starter`). The `post-create.sh` script also rewrites the `.env` file to use the `db` hostname if creating from `.env.example`.
