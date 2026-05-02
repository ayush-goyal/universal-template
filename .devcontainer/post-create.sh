#!/usr/bin/env bash
set -euo pipefail

pnpm install --force

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@db:5432/expo-starter"|' .env
  sed -i 's|DATABASE_DIRECT_URL=.*|DATABASE_DIRECT_URL="postgresql://postgres:postgres@db:5432/expo-starter"|' .env
fi

pnpm --filter @acme/db db:migrate
