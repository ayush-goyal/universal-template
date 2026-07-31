---
name: verify-changes
description: Run the quality gate before claiming work is finished, and interpret or fix its failures. Covers pnpm verify, the check and fix split, what CI runs, affected-package scoping, and how to diagnose lint, typecheck, and test failures in this Turborepo monorepo. Use before reporting a task complete, when asked to run the checks or tests, when CI is red, or when deciding whether a failure is autofixable.
---

# Verifying a change

```bash
pnpm verify        # THE gate: autofix, then check affected packages
```

Run this before you claim any code change is done. It is two steps:

1. `pnpm fix` — `eslint --fix` then `prettier --write` across the repo. Mutating. Running it first
   means autofixable problems never reach you as failures.
2. `pnpm check` — `lint`, `typecheck`, and `test` on affected packages. Non-mutating. **This is
   exactly what CI runs**, so a green `pnpm check` means a green PR.

Use `pnpm verify:all` instead when you have touched anything shared — `turbo.json`, `tooling/*`, root
config, `pnpm-workspace.yaml` — because affected-package detection reasons about the dependency graph
from changed files and shared config changes deserve a full sweep anyway.

## The check / fix split

Every package script is non-mutating by default so that CI and agents can run it safely. Mutation is
opt-in via an explicit `:fix` variant.

| Non-mutating                         | Mutating                                 |
| ------------------------------------ | ---------------------------------------- |
| `pnpm lint` → `eslint .`             | `pnpm lint:fix` → `eslint --fix .`       |
| `pnpm format` → `prettier --check .` | `pnpm format:fix` → `prettier --write .` |
| `pnpm typecheck`, `pnpm test`        | —                                        |

Never add `--fix` or `--write` to a `lint` or `format` script. The mutating form is a **separate
package script** (`lint:fix`, `format:fix`) with its own `cache: false` task in `turbo.json`, because
caching a task that rewrites files means a cache hit silently skips the rewrite.

### Never pass flags through `--`

Do not write `turbo run lint -- --fix` or add `-- --cache-location ...` to a root script, however
tempting. Passthrough args are a **global** hash input: they change the hash of every task in the run,
including dependencies. Verified on this repo — adding `-- --fix` to `turbo run lint` moved
`@acme/api#build` from `7032c09ec4a1cd97` to `d850260efdc6ea19`, so that invocation shared no cache
with `build`, `typecheck`, or `test`. Flags belong in the package script, where they are part of the
package's own definition and every caller produces the same hash.

For the same reason, ESLint's and Prettier's own `--cache` flags are deliberately **not** used here.
Turborepo's task cache already skips the whole task when nothing changed, which is strictly better;
the file-level cache only saved about a second on a changed package and nothing at all in CI, where a
fresh checkout has no cache file to restore. This matches Turborepo's official ESLint guide, which
specifies a plain `"lint": "eslint ."`.

## Narrowing a failure

`pnpm check` runs everything and reports at the end. To iterate on one package, drop to it directly:

```bash
pnpm --filter @acme/api test        # one package's tests
pnpm --filter @acme/api typecheck
pnpm --filter @acme/web lint
pnpm --filter @acme/api test -- --reporter=verbose src/__tests__/router.test.ts
```

Add `--force` to a turbo command to ignore the cache when you suspect a stale result, and
`--output-logs=errors-only` to cut successful-task noise.

## Reading failures

- **`Cannot find module '@acme/...'` or a missing Prisma type** — a generated or built artifact is
  missing, not a code error. `pnpm install` regenerates the Prisma client; `typecheck` depends on
  `^build`, so a broken upstream package cascades. Fix the upstream package first.
- **Typecheck passes locally, fails in CI** — usually a stale local `.cache/tsbuildinfo.json`. Re-run
  with `--force`.
- **Lint error about an unused variable in a `catch`** — prefix with `_` rather than deleting the
  binding.
- **A test failing with "cannot read properties of undefined"** on a database call — `packages/api`
  mocks `@acme/db` wholesale, so a newly used model or method has to be added to the mock.
- **Formatting churn in files you did not touch** — you ran a `:fix` task on a package with
  pre-existing violations. Keep those out of your diff.

## Gotchas

- `pnpm check` resolves affected packages against `main`, counting uncommitted changes. When there is
  no diff at all it legitimately runs **nothing** and exits green. If the task count looks
  suspiciously low, use `pnpm check:all`.
- Everything except `generate` is cached, including `test`, so a fully warm `pnpm check` finishes in
  about a second at 33 of 34 tasks cached. The one permanent miss is `generate` (`prisma generate`,
  declared `cache: false`), not a cache bug. A cached test pass is a real pass: it only happens when
  every input hashes identically.
- Never declare `outputs` for a task that writes no files. `test` and `lint` are log-only, and naming
  a path that never appears makes Turbo warn `no output files found for task ...` on every run.
- `lint` and `typecheck` both `dependsOn: ["^build"]`, because type-aware linting needs upstream
  `dist/*.d.ts` files. A broken upstream package therefore fails as a build error, not a lint error.
- `pnpm dev` uses `turbo watch`, which does not typecheck. A change can look fine in the browser and
  still fail `pnpm check`.
- Do not report success on the strength of a partial command. `pnpm --filter <one> test` passing is
  not the gate.
