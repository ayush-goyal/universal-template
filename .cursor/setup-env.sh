#!/usr/bin/env bash
# Idempotent .env setup for Cursor Cloud Agents.
# Copies .env.example (which has optional vars commented out) and sets DATABASE_URL.
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres@localhost:5432/expo-starter"|' .env
  sed -i 's|DATABASE_DIRECT_URL=.*|DATABASE_DIRECT_URL="postgresql://postgres@localhost:5432/expo-starter"|' .env
fi
