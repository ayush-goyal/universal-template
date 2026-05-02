FROM node:22-bookworm

RUN corepack enable && corepack prepare pnpm@10.6.3 --activate

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       git \
       curl \
       postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
