# Universal Template

A production-ready monorepo template for building full-stack applications with React Native,
Next.js, and Hono. Cloudflare Workers deployment is preconfigured through vinext and Wrangler
without replacing the normal Next.js and Node development/deployment paths.

## 🚀 Features

### Core Stack

- **Mobile App:** React Native with [Expo SDK 56](https://expo.dev/) development builds and New Architecture enabled
- **Web App:** [Next.js 16](https://nextjs.org/) with App Router, React Server Components, tRPC,
  auth, and an optional [vinext](https://vinext.dev/) Workers build
- **Secondary Server:** Portable [Hono](https://hono.dev/) database example and health service
- **Hosting:** Cloudflare Workers with Wrangler and one GitHub Actions deployment pipeline
- **Type Safety:** End-to-end type safety with TypeScript and [tRPC](https://trpc.io/)
- **Monorepo Management:** [Turborepo](https://turbo.build/repo) with pnpm workspaces for optimized builds

### Authentication & Security

- **[Better Auth](https://www.better-auth.com/):** Complete authentication system with:
  - Email/password authentication
  - Phone number authentication via Twilio OTP
  - Google OAuth integration
  - Email verification
  - Password reset flows
- **Firebase Integration:** Native push notifications, token registration, and App Check

### Styling & UI

- **Mobile:** [NativeWind](https://www.nativewind.dev/) v5 with theme provider
- **Web:** [Tailwind CSS v4](https://tailwindcss.com/) with Shadcn/ui

### Data & State Management

- **Database:** [Prisma](https://www.prisma.io/) v7 ORM with PostgreSQL/Supabase
- **Server State:** [TanStack Query](https://tanstack.com/query) (React Query) via tRPC
- **Client State:** [Zustand](https://zustand-demo.pmnd.rs/) for local state management

### Developer Experience

- **Type Safety:** Shared TypeScript configurations
- **Code Quality:** Type-aware Oxlint, Prettier, Husky pre-commit hooks

### Mobile-Specific Features

- **Push Notifications:** Firebase Cloud Messaging
- **Permissions:** Camera, notifications, location handling
- **Device Info:** Platform-specific utilities
- **App Store Ready:** EAS Build & Submit configured

## 📁 Project Structure

```
.
├── apps/
│   ├── native/          # Expo React Native app
│   │   ├── app/         # App screens and navigation
│   │   ├── assets/      # Images and static files
│   │   ├── config/       # Firebase credentials
│   │   └── eas.json     # EAS Build configuration
│   ├── server/          # Portable Hono database example and health server
│   │   └── src/         # Server source code
│   └── web/             # Next.js web app
│       ├── app/         # App Router pages
│       └── components/  # React components
├── packages/
│   ├── api/             # tRPC router definitions
│   ├── auth/            # Better Auth configuration
│   ├── db/              # Prisma schema and client
│   └── shared/          # Shared utilities and types
├── tooling/
│   ├── prettier/        # Shared Prettier config
│   ├── typescript/      # Shared TypeScript configs
│   └── vitest/          # Shared Vitest config
├── .oxlintrc.json       # Shared Oxlint rules
├── .env.example         # Environment variables template
├── CLAUDE.md            # AI assistant instructions
├── package.json         # Root workspace configuration
├── pnpm-workspace.yaml  # pnpm workspace definition
└── turbo.json           # Turborepo pipeline config
```

## 🛠️ Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** >=22.14.0 ([Download](https://nodejs.org/))
- **pnpm:** >=9.6.0 ([Installation Guide](https://pnpm.io/installation))
- **Xcode:** 26.4+
- **Android Studio:** Latest version with Android SDK 26+

### 1. Clone and Install

```bash
# Clone the repository
gh repo clone ayush-goyal/universal-template
cd universal-template

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment variables template
cp .env.example .env

# Configure your .env file
```

### 3. Firebase Setup

#### iOS Configuration

1. Create iOS app in [Firebase Console](https://console.firebase.google.com/)
2. Download `GoogleService-Info.plist`
3. Place at `apps/native/config/GoogleService-Info.plist`

#### Android Configuration

1. Create Android app in Firebase Console
2. Download `google-services.json`
3. Place at `apps/native/config/google-services.json`

### 4. Database Setup

```bash
# Run migrations
pnpm --filter @acme/db db:migrate

# Open Prisma Studio (optional)
pnpm --filter @acme/db db:studio
```

### 5. Start Development

```bash
# Run all apps in development mode
pnpm dev

# Or run specific apps
pnpm --filter @acme/native dev      # Mobile app
pnpm --filter @acme/web dev         # Web app
pnpm --filter @acme/server dev      # API server

# For Android physical device
pnpm --filter @acme/native adb
```

### 6. Cloudflare Deployment

The repository has one workflow, `.github/workflows/deploy.yml`. Pull requests run checks and
build both Workers. A push to `main` deploys the Hono and vinext Workers.

GitHub only needs Cloudflare deployment credentials:

- Repository variable: `CLOUDFLARE_ACCOUNT_ID`
- Actions secret: `CLOUDFLARE_API_TOKEN`

Configure application secrets directly on the corresponding Worker in Cloudflare. Wrangler
preserves existing secrets during deployments. At minimum, set `DATABASE_DIRECT_URL` on both
Workers; the Workerd client uses Prisma Postgres' serverless HTTP/WebSocket adapter rather than a
TCP connection. Normal Node development continues to use the pooled `DATABASE_URL`.
Set the Better Auth, Resend, Google OAuth, Twilio, and OpenAI values
from `.env.example` on `acme-web` as the enabled features require them.

```bash
pnpm --filter @acme/server exec wrangler secret put DATABASE_DIRECT_URL
pnpm --filter @acme/server exec wrangler secret put ALLOWED_ORIGINS
pnpm --filter @acme/web exec wrangler secret put DATABASE_DIRECT_URL
pnpm --filter @acme/web exec wrangler secret put SITE_URL
```

Production schema migrations remain an explicit operation:

```bash
pnpm --filter @acme/db db:migrate:prod
```

Wrangler deploys `acme-web` and `acme-server` to their `workers.dev` URLs by default. Add custom
domains in Cloudflare and update the web Worker's `SITE_URL` and OAuth callbacks before production use.

Cloudflare is preconfigured, not mandatory. The default `dev`, `build`, and `start` scripts still
use ordinary Next.js and Node, so the web app can deploy to Vercel or another Next.js host and the
Hono app can run on any supported Node/container host. Only `*:cloudflare` scripts select vinext,
workerd-specific Prisma output, and Wrangler.

Useful local commands:

```bash
# Normal local development stays on Next.js and Node.
pnpm dev

# Cloudflare-only checks and previews are opt-in.
pnpm --filter @acme/web build:cloudflare
pnpm --filter @acme/web preview:cloudflare
pnpm --filter @acme/server build:cloudflare
pnpm --filter @acme/server dev:cloudflare
```

## 📜 Essential Commands

### Development

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Clean all build artifacts
pnpm clean
```

### Database

```bash
# Run migrations
cd packages/db && pnpm db:migrate

# Deploy migrations (production)
cd packages/db && pnpm db:migrate:prod
```

## 🔧 Configuration

### Package Naming

All packages use the `@acme/` namespace. To rename:

1. Find and replace `@acme/` with `@your-company/`
2. Update all `package.json` files
3. Update import statements

## 📚 Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [vinext Documentation](https://vinext.dev/)
- [Hono Documentation](https://hono.dev/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo)
- Built with tools from the JavaScript ecosystem
