# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.6.3 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @acme/db generate

ENV NODE_ENV=development
EXPOSE 3000

# The local demo uses the ordinary Next.js Node runtime. Build and deployment
# validation remain separate from the Compose workflow.
CMD ["pnpm", "--filter", "@acme/web", "exec", "next", "dev", "-H", "0.0.0.0"]
