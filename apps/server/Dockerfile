FROM node:22.14-alpine AS base

# Setup pnpm
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Builder stage - prunes the monorepo
FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN pnpm add -g turbo@^2.5.6

# Copy entire monorepo and prune for server workspace
COPY . .
RUN turbo prune @acme/server --docker

# Installer stage - installs dependencies and builds the project
FROM base AS installer
RUN apk update
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

# Copy built application with correct ownership
COPY --from=installer --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nodejs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=installer --chown=nodejs:nodejs /app/apps/server/package.json ./apps/server/package.json
COPY --from=installer --chown=nodejs:nodejs /app/packages ./packages

USER nodejs
ENV NODE_ENV=production
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the server
CMD ["node", "apps/server/dist/index.js"]
