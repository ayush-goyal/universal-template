#!/usr/bin/env bash
# Idempotent .env setup for Cursor Cloud Agents.
# Creates .env from .env.example if it does not exist, then patches it
# for local development. Safe to run multiple times.
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env

  # Point at local PostgreSQL (trust auth, no password)
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres@localhost:5432/expo-starter"|' .env
  sed -i 's|DATABASE_DIRECT_URL=.*|DATABASE_DIRECT_URL="postgresql://postgres@localhost:5432/expo-starter"|' .env

  # Comment out empty optional vars that fail @t3-oss/env-nextjs URL validation
  sed -i 's/^NEXT_PUBLIC_SENTRY_DSN=$/# NEXT_PUBLIC_SENTRY_DSN=/' .env
  sed -i 's/^SENTRY_ORG=$/# SENTRY_ORG=/' .env
  sed -i 's/^SENTRY_PROJECT=$/# SENTRY_PROJECT=/' .env
  sed -i 's/^SENTRY_AUTH_TOKEN=$/# SENTRY_AUTH_TOKEN=/' .env
  sed -i 's/^NEXT_PUBLIC_POSTHOG_KEY=$/# NEXT_PUBLIC_POSTHOG_KEY=/' .env
  sed -i 's/^GOOGLE_APPLICATION_CREDENTIALS=$/# GOOGLE_APPLICATION_CREDENTIALS=/' .env
  sed -i 's/^GOOGLE_CLOUD_PROJECT=$/# GOOGLE_CLOUD_PROJECT=/' .env
  sed -i 's/^GOOGLE_CLOUD_PRIVATE_KEY=$/# GOOGLE_CLOUD_PRIVATE_KEY=/' .env
  sed -i 's/^GOOGLE_CLOUD_CLIENT_EMAIL=$/# GOOGLE_CLOUD_CLIENT_EMAIL=/' .env
fi

# Ensure RESEND_API_KEY is set (required by auth at runtime, dummy value is fine for dev)
if ! grep -q '^RESEND_API_KEY=' .env; then
  echo 'RESEND_API_KEY=re_123' >> .env
fi
