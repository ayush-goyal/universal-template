#!/usr/bin/env bash
set -euo pipefail

pnpm install --force

# Copy .env from template if it doesn't already exist
if [ ! -f .env ]; then
  cp .env.example .env

  # Point DATABASE_URL at the Compose "db" service
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@db:5432/expo-starter"|' .env
  sed -i 's|DATABASE_DIRECT_URL=.*|DATABASE_DIRECT_URL="postgresql://postgres:postgres@db:5432/expo-starter"|' .env

  # Comment out empty optional env vars that fail URL validation
  sed -i 's/^NEXT_PUBLIC_SENTRY_DSN=$/# NEXT_PUBLIC_SENTRY_DSN=/' .env
  sed -i 's/^SENTRY_ORG=$/# SENTRY_ORG=/' .env
  sed -i 's/^SENTRY_PROJECT=$/# SENTRY_PROJECT=/' .env
  sed -i 's/^SENTRY_AUTH_TOKEN=$/# SENTRY_AUTH_TOKEN=/' .env
  sed -i 's/^NEXT_PUBLIC_POSTHOG_KEY=$/# NEXT_PUBLIC_POSTHOG_KEY=/' .env
  sed -i 's/^GOOGLE_APPLICATION_CREDENTIALS=$/# GOOGLE_APPLICATION_CREDENTIALS=/' .env
  sed -i 's/^GOOGLE_CLOUD_PROJECT=$/# GOOGLE_CLOUD_PROJECT=/' .env
  sed -i 's/^GOOGLE_CLOUD_PRIVATE_KEY=$/# GOOGLE_CLOUD_PRIVATE_KEY=/' .env
  sed -i 's/^GOOGLE_CLOUD_CLIENT_EMAIL=$/# GOOGLE_CLOUD_CLIENT_EMAIL=/' .env

  # Add RESEND_API_KEY placeholder (required by auth at runtime)
  if ! grep -q '^RESEND_API_KEY=' .env; then
    echo 'RESEND_API_KEY=re_123' >> .env
  fi
fi

# Run database migrations
pnpm --filter @acme/db db:migrate
