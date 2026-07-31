# Agent configuration

```
AGENTS.md                    repo-wide instructions, always loaded
.agents/skills/<name>/       on-demand skills, read natively by Cursor and Codex
.cursor/mcp.json             MCP servers for Cursor
.codex/config.toml           the same MCP servers for Codex
```

No build or sync step: every file is hand-written and committed, so a fresh clone and a cloud agent
get the same setup as your laptop.

## Setup

**Cursor** — enable the five servers under Customize. `expo` prompts for OAuth on first use;
`context7` needs nothing. `XcodeBuildMCP` needs Xcode locally, so leave it off on Linux and in cloud
agents — the toggle in Cursor, `enabled = false` in Codex.

**Codex** — run `codex` here once and accept the trust prompt, or the entire `.codex/` layer is
ignored and the servers never appear. Then `codex mcp login expo`. Codex does not read `.env`; a
server needing a credential reads it from Codex's own shell, so export it there (direnv, or
`set -a; source .env; set +a`).

**Expo local capabilities** (screenshots, taps, logs — macOS, simulators only):

```bash
pnpm --filter @acme/native exec expo install expo-mcp --dev
pnpm --filter @acme/native dev:mcp
```

Reconnect the MCP server afterwards, and after every dev-server restart. See `verify-ios`.

## Adding or changing a server

Copy the shape of an existing entry in each file, then:

1. Edit **both** files. Nothing enforces it — that is why the list stays short.
2. Name it `[a-zA-Z0-9_-]+`; Codex rejects anything else.
3. Keep credentials out of both files. Cursor: `"${env:TOKEN}"` in `env` or `headers`. Codex:
   `env_vars = ["TOKEN"]` (stdio) or `bearer_token_env_var = "TOKEN"` (HTTP), since a `${VAR}`
   placeholder there is sent literally.
4. MCP credentials are not application environment variables. Do not add them to `.env.example` or
   `apps/web/env.ts` — the `env-vars` skill is about variables the apps validate at build time.
5. Give `pnpm dlx` servers `startup_timeout_sec = 60` in Codex; the first run downloads the package.

## Deliberately not enabled

- **git / GitHub** — `gh` is installed and authenticated, covers more, and costs no tools.
- **database** — `db:studio` and `psql` cover inspection, `prisma-schema` covers migrations, and a
  SQL-capable server on a real database is the easiest way for an agent to do damage.
- **Sentry** — the SDKs are installed but the DSN variables in `.env.example` are still commented
  out, so there is nothing to query yet.
- **chrome-devtools** — overlaps `playwright` except for profiling, and doubles the browser tools.

## Hooks

Not used. Both harnesses support them (`.cursor/hooks.json`; Codex behind `features.hooks`), but the
Hard rules in `AGENTS.md` and each harness's approval settings cover the same ground without running
a script on every edit and command.
