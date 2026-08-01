# Agent configuration

```
AGENTS.md                       repo-wide instructions, always loaded
CLAUDE.md                       one line, `@AGENTS.md` — all Claude Code loads on its own
.agents/skills/<name>/          on-demand skills, read natively by Cursor and Codex
.claude/skills   -> .agents/skills     the only skill path Claude Code scans
.cursor/mcp.json                MCP servers for Cursor, and for Claude Code via the symlink
.mcp.json        -> .cursor/mcp.json   the project MCP scope Claude Code reads
.codex/config.toml              the same MCP servers for Codex
```

No build or sync step: every file is hand-written and committed, so a fresh clone and a cloud agent
get the same setup as your laptop. The two symlinks are committed as symlinks (git mode `120000`);
on Windows a clone needs `git config core.symlinks true` and Developer Mode.

## Why symlinks for Claude Code

Claude Code has no setting for either location, so a symlink is the only way to avoid a second copy:

- Skills load from `.claude/skills/` and `~/.claude/skills/` only. A `skillsPaths` setting has been
  requested repeatedly and closed every time, and `--add-dir` looks for `.claude/skills/` inside the
  added directory, so it does not help. Claude Code follows the symlink, loads all of
  `.agents/skills/`, and honours `paths:` the same way Cursor does — a scoped skill stays hidden
  until Claude touches a matching file.
- Project MCP servers load from `.mcp.json` at the repo root. Claude Code follows that symlink too.
- Instructions load from `CLAUDE.md`. `AGENTS.md` is never read, and there is no fallback; the
  `@AGENTS.md` import is Anthropic's own recommendation. Put Claude-only notes below the import.

Keeping `.cursor/mcp.json` as the real file means the two `type: "http"` entries are written for
Claude Code's parser, which rejects a `url` with no `type`. Cursor ignores `type` and routes on
whether the entry has `url` or `command`, so the explicit field costs it nothing.

## Setup

**Cursor** — enable the five servers under Customize. `expo` prompts for OAuth on first use;
`context7` needs nothing. `XcodeBuildMCP` needs Xcode locally, so leave it off on Linux and in cloud
agents — the toggle in Cursor, `enabled = false` in Codex.

**Codex** — run `codex` here once and accept the trust prompt, or the entire `.codex/` layer is
ignored and the servers never appear. Then `codex mcp login expo`. Codex does not read `.env`; a
server needing a credential reads it from Codex's own shell, so export it there (direnv, or
`set -a; source .env; set +a`).

**Claude Code** — start it from the repo root and accept the workspace trust dialog; project skills
and `.mcp.json` stay inert until you do. Then approve the servers once, per server, at the prompt or
in `/mcp`. `XcodeBuildMCP` has no toggle here, so switch it off on Linux and in cloud agents with
`{"disabledMcpjsonServers": ["XcodeBuildMCP"]}` in `.claude/settings.local.json`, which is
gitignored. `/mcp` handles the `expo` OAuth login.

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
3. Give every HTTP server an explicit `"type": "http"`. Claude Code skips an entry that has a `url`
   and no `type`, and it shares `.cursor/mcp.json` through the `.mcp.json` symlink.
4. Keep credentials out of both files. Cursor: `"${env:TOKEN}"` in `env` or `headers`. Codex:
   `env_vars = ["TOKEN"]` (stdio) or `bearer_token_env_var = "TOKEN"` (HTTP), since a `${VAR}`
   placeholder there is sent literally. Claude Code expands `${TOKEN}` and `${TOKEN:-default}` but
   not Cursor's `${env:TOKEN}` form, so a credentialed server is the one case where the shared file
   cannot satisfy both — give it a Claude-only entry in `~/.claude.json` via
   `claude mcp add --scope local`, and leave the shared file for Cursor.
5. MCP credentials are not application environment variables. Do not add them to `.env.example` or
   `apps/web/env.ts` — the `env-vars` skill is about variables the apps validate at build time.
6. Give `pnpm dlx` servers `startup_timeout_sec = 60` in Codex; the first run downloads the package.

## Deliberately not enabled

- **git / GitHub** — `gh` is installed and authenticated, covers more, and costs no tools.
- **database** — `db:studio` and `psql` cover inspection, `prisma-schema` covers migrations, and a
  SQL-capable server on a real database is the easiest way for an agent to do damage.
- **Sentry** — the SDKs are installed but the DSN variables in `.env.example` are still commented
  out, so there is nothing to query yet.
- **chrome-devtools** — overlaps `playwright` except for profiling, and doubles the browser tools.

## Hooks

Not used. All three harnesses support them (`.cursor/hooks.json`; Codex behind `features.hooks`;
`.claude/settings.json`), but the Hard rules in `AGENTS.md` and each harness's approval settings
cover the same ground without running a script on every edit and command.
