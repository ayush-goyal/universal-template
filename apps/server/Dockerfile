# syntax=docker/dockerfile:1

ARG ALPINE_VERSION=3.23
ARG NODE_VERSION=22.23.2

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS build-base

# Setup pnpm
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Builder stage - prunes the monorepo
FROM build-base AS pruner

# Install turbo globally
RUN --mount=type=cache,id=acme-pnpm,target=/pnpm/store \
    pnpm add --global turbo@2.9.7

# Copy entire monorepo and prune for server workspace
COPY --link . .
RUN turbo prune @acme/server --docker

# Installer stage - installs dependencies and builds the project
FROM build-base AS builder

# First install dependencies (as they change less often)
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=acme-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy full source and build the project
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=acme-server-turbo,target=/app/.turbo \
    pnpm turbo run build --filter=@acme/server

# Runner stage - minimal production image
FROM alpine:${ALPINE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't run production as root
RUN apk add --no-cache libstdc++ && \
    addgroup --gid 1000 node && \
    adduser --uid 1000 --ingroup node --shell /bin/sh --disabled-password node
USER node

# Production-only dependencies are bundled into the built application
COPY --link --from=build-base /usr/local/bin/node /usr/local/bin/
COPY --link --from=builder --chown=1000:1000 /app/apps/server/dist ./dist

EXPOSE 3001

# Start the server
CMD ["node", "dist/server.node.js"]
