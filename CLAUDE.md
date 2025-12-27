# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Turborepo monorepo for building mobile and web applications with a shared API. The codebase uses:

- **Monorepo structure**: Turborepo with pnpm workspaces
- **Mobile app** (`apps/native`): React Native with Expo SDK 52, NativeWind for styling, React Navigation
- **Web app** (`apps/web`): Next.js 15 with App Router, Tailwind CSS v4, Radix UI components
- **API server** (`apps/server`): Express server with tRPC API endpoints
- **Shared packages**:
  - `packages/api`: tRPC router definitions and business logic
  - `packages/auth`: Better Auth authentication system
  - `packages/db`: Prisma ORM with PostgreSQL/Supabase
  - `packages/shared`: Shared utilities and types
- **State management**: Zustand for local state, React Query for server state
- **Type safety**: End-to-end type safety with TypeScript and tRPC

## Essential Commands

### Development

```bash
# Install dependencies (use pnpm, not npm or yarn)
pnpm install

# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter @acme/native dev     # Mobile app
pnpm --filter @acme/web dev        # Web app
pnpm --filter @acme/server dev     # API server

# For Android development with physical device
pnpm --filter @acme/native adb
```

### Code Quality

```bash
# Type checking - ALWAYS run before committing
pnpm typecheck

# Linting - ALWAYS run before committing
pnpm lint

# Format code
pnpm format

# Clean all build artifacts and caches
pnpm clean
```

### Database

```bash
# Run database migrations
pnpm --filter @acme/db db:migrate

# Deploy migrations in production
pnpm --filter @acme/db db:migrate:prod

# Open Prisma Studio (database GUI)
pnpm --filter @acme/db db:studio
```

### Building & Deployment

#### Web App

```bash
pnpm --filter @acme/web build
pnpm --filter @acme/web start  # Start production server
```

#### Native App

```bash
# Build iOS app locally (requires EAS setup)
pnpm --filter @acme/native build:ios

# Build Android app locally
pnpm --filter @acme/native build:android

# Submit to app stores (requires built .ipa/.aab files)
pnpm --filter @acme/native submit:ios /path/to/app.ipa
pnpm --filter @acme/native submit:android /path/to/app.aab
```

## Project Conventions

### Package Naming

All packages use the `@acme/` namespace. When referencing packages in imports or commands, use this prefix.

### Environment Variables

- Development variables go in `.env` at the root
- The `.env.example` file documents all required variables
- Firebase credentials required: `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) in `apps/native/`
- Service account JSON required in `packages/api/` for backend Firebase operations

### API Integration

- The mobile app connects to the API through tRPC clients configured in `apps/native/src/utils/api.ts`
- The web app uses tRPC through `apps/web/src/trpc/`
- API routes are defined in `packages/api/src/router/`

### Testing Approach

Check individual package.json files for test scripts. The project uses TypeScript for type safety as the primary testing approach.

### Mobile Development Notes

- The app uses Expo SDK 52 with development builds (not Expo Go)
- Run `pnpm --filter @acme/native prebuild:clean` if you need to regenerate native directories
- EAS configuration is in `apps/native/eas.json` - requires Apple Team ID and App Store ID for iOS submission

### State Management Pattern

- Use Zustand for client-side state that needs to persist or be shared across components
- Use React Query (via tRPC) for server state
- Avoid prop drilling by using context or Zustand stores

### Authentication Flow

The project uses Better Auth with Firebase integration. Auth configuration is in `packages/auth/` and is shared between web and mobile apps.
