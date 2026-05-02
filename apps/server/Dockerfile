FROM node:22.14-alpine AS base

# Setup pnpm
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Builder stage - prunes the monorepo
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN pnpm add -g turbo@^2.9.7

# Copy entire monorepo and prune for server workspace
COPY . .
RUN turbo prune @acme/server --docker

# Installer stage - installs dependencies and builds the project
FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy full source and build the project
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/turbo.json ./turbo.json
RUN pnpm build --filter=@acme/server

# Runner stage - minimal production image
FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Install production-only dependencies
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --prod

# Copy built application
COPY --from=installer --chown=nodejs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=installer --chown=nodejs:nodejs /app/apps/server/package.json ./apps/server/package.json

USER nodejs
ENV NODE_ENV=production
EXPOSE 3001

# Start the server
CMD ["node", "apps/server/dist/index.js"]
