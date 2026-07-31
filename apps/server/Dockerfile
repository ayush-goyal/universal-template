# syntax=docker/dockerfile:1.7
#
# Multi-stage build for @acme/server.
#
# Pipeline:
#   1. `pruner`   — runs `turbo prune` to slice the monorepo down to just the
#                   files needed to build @acme/server (json + full layouts).
#   2. `builder`  — installs all deps, generates Prisma client, runs tsup via
#                   turbo, then uses `pnpm deploy --prod --legacy` to emit a
#                   self-contained /prod/server tree with a minimal production
#                   node_modules.
#   3. `runner`   — copies /prod/server into a fresh slim image. No pnpm, no
#                   turbo, no build tooling on the runtime layer.
#
# Intentional choices:
#   - Base image: node:22-bookworm-slim (matches .cursor/Dockerfile; Prisma 7
#     uses a wasm query compiler so glibc vs musl is not a concern).
#   - BuildKit cache mounts on pnpm's content-addressable store for fast
#     incremental builds in CI (cache-from: type=gha in the workflow).
#   - Root .dockerignore keeps `COPY . .` tiny — no node_modules, no .git,
#     no .next, no .turbo.
#
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

########################################################
# 1. PRUNER — slice the monorepo to just what @acme/server needs
########################################################
FROM base AS pruner
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm add -g turbo@^2.9.7
COPY . .
RUN turbo prune @acme/server --docker

########################################################
# 2. BUILDER — install, generate Prisma, build, deploy --prod
########################################################
FROM base AS builder

# Install full dep tree using only the pruned package.json set so this layer
# only invalidates when a package.json or the lockfile changes.
# `--link` lets BuildKit hard-link from the pruner stage instead of copying
# bytes; `--prefer-offline` skips registry HEADs when the cache mount already
# has the tarball.
COPY --link --from=pruner /app/out/json/ .
COPY --link --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --link --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --prefer-offline

# Bring in the pruned source and run the build. turbo build transitively
# runs @acme/db's `generate` task (prisma generate) before tsup, so the
# bundled dist/index.js contains the generated client + wasm.
COPY --link --from=pruner /app/out/full/ .
COPY --link turbo.json ./turbo.json
RUN pnpm turbo run build --filter=@acme/server

# Emit a self-contained prod package with only runtime deps.
# --legacy avoids requiring inject-workspace-packages in .npmrc.
# The server's tsup bundle uses `noExternal: ["@acme/api", "@acme/db"]` so
# those workspace packages are inlined; pnpm deploy resolves the remaining
# external npm closure (express, helmet, @prisma/client, etc.).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter=@acme/server --prod --legacy deploy /prod/server

########################################################
# 3. RUNNER — minimal production image
########################################################
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --create-home nodejs

COPY --link --from=builder --chown=nodejs:nodejs /prod/server ./

USER nodejs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
