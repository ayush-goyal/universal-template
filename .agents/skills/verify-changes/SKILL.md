---
name: verify-changes
description: Run the quality gate before claiming work is finished, and interpret its failures. Covers pnpm verify, the check/fix split, what CI runs, affected-package scoping, and diagnosing lint, typecheck, and test failures in this Turborepo monorepo. Use before reporting a task complete, when asked to run the checks or tests, when CI is red, or when deciding whether a failure is autofixable.
---

# Verifying a change

```bash
pnpm verify        # THE gate: autofix, then check affected packages
```

Two steps: `pnpm fix` (`eslint --fix` then `prettier --write`; mutating, and running first means
autofixable problems never reach you as failures), then `pnpm check` (`lint`, `typecheck`, `test` on
affected packages; non-mutating). **`check` is exactly what CI runs**, so a green `check` means a
green PR. Use `pnpm verify:all` after touching anything shared — `turbo.json`, `tooling/*`, root
config, `pnpm-workspace.yaml`.

This gate proves the code compiles and the tests pass. Whether the thing works is a separate
question: `verify-web` for the browser, `verify-ios` for the simulator.

## The check / fix split

Every script is non-mutating by default so CI and agents can run it safely; mutation is opt-in.

| Non-mutating                         | Mutating                                 |
| ------------------------------------ | ---------------------------------------- |
| `pnpm lint` → `eslint .`             | `pnpm lint:fix` → `eslint --fix .`       |
| `pnpm format` → `prettier --check .` | `pnpm format:fix` → `prettier --write .` |
| `pnpm typecheck`, `pnpm test`        | —                                        |

Never add `--fix` or `--write` to a `lint` or `format` script. The mutating form is a separate script
with its own `cache: false` task in `turbo.json`, because caching a task that rewrites files means a
cache hit silently skips the rewrite.

**Never pass flags through `--`.** Passthrough args are a _global_ hash input: they rehash every task
in the run, dependencies included. Measured here, adding `-- --fix` to `turbo run lint` changed
`@acme/api#build`'s hash, so that invocation shared no cache with `build`, `typecheck`, or `test`.
Flags belong in the package script, where every caller produces the same hash. For the same reason
ESLint's and Prettier's own `--cache` flags are unused: Turbo already skips the whole task, the
file-level cache saved about a second locally and nothing in CI, and Turborepo's own ESLint guide
specifies a plain `"lint": "eslint ."`.

## Narrowing a failure

```bash
pnpm --filter @acme/api test
pnpm --filter @acme/web lint
pnpm --filter @acme/api test -- --reporter=verbose src/__tests__/router.test.ts
```

Add `--force` to ignore a cache you suspect is stale, `--output-logs=errors-only` to cut noise.

## Reading failures

- **`Cannot find module '@acme/...'` or a missing Prisma type** — a generated or built artifact is
  missing, not a code error. `pnpm install` regenerates the Prisma client; `typecheck` depends on
  `^build`, so fix the upstream package first.
- **Passes locally, fails in CI** — usually a stale `.cache/tsbuildinfo.json`. Re-run with `--force`.
- **Unused variable in a `catch`** — prefix it with `_` rather than deleting the binding.
- **"cannot read properties of undefined" on a database call** — `packages/api` mocks `@acme/db`
  wholesale, so a newly used model or method has to be added to the mock.
- **Formatting churn in files you did not touch** — a `:fix` task hit pre-existing violations. Keep
  those out of your diff.

## Gotchas

- `pnpm check` resolves affected packages against `main`, counting uncommitted changes. With no diff
  it legitimately runs **nothing** and exits green. If the task count looks too low, use
  `pnpm check:all`.
- Everything except `generate` is cached, `test` included, so a warm `check` finishes in about a
  second. The permanent miss is `generate` (`cache: false`), not a bug — and a cached test pass is a
  real pass, since it only happens when every input hashes identically.
- Never declare `outputs` for a log-only task like `test` or `lint`; Turbo then warns `no output
files found for task ...` on every run.
- `lint` and `typecheck` both `dependsOn: ["^build"]`, because type-aware linting needs upstream
  `dist/*.d.ts`. A broken upstream package therefore fails as a build error.
- `pnpm dev` uses `turbo watch`, which does not typecheck. Browser-fine still fails `pnpm check`.
- `pnpm --filter <one> test` passing is not the gate. Do not report success on a partial command.
