# Universal Template

A production-ready monorepo template for building full-stack applications with React Native, Next.js, and Express. This template provides everything you need to build and ship mobile apps (iOS/Android) and web applications with a shared API and authentication system.

## 🚀 Features

### Core Stack

- **Mobile App:** React Native with [Expo SDK 54](https://expo.dev/) development builds and New Architecture enabled
- **Web App:** [Next.js 15](https://nextjs.org/) with App Router and React Server Components
- **API Server:** Express server with tRPC endpoints and Prisma ORM
- **Type Safety:** End-to-end type safety with TypeScript and [tRPC](https://trpc.io/)
- **Monorepo Management:** [Turborepo](https://turbo.build/repo) with pnpm workspaces for optimized builds

### Authentication & Security

- **[Better Auth](https://www.better-auth.com/):** Complete authentication system with:
  - Email/password authentication
  - Phone number authentication via Twilio OTP
  - Google OAuth integration
  - Email verification
  - Password reset flows
- **Firebase Integration:** Push notifications and App Check

### Styling & UI

- **Mobile:** [NativeWind](https://www.nativewind.dev/) v5 with theme provider
- **Web:** [Tailwind CSS v4](https://tailwindcss.com/) with Shadcn/ui

### Data & State Management

- **Database:** [Prisma](https://www.prisma.io/) v7 ORM with PostgreSQL/Supabase
- **Server State:** [TanStack Query](https://tanstack.com/query) (React Query) via tRPC
- **Client State:** [Zustand](https://zustand-demo.pmnd.rs/) for local state management

### Monetization & Analytics

- **Payments:** [Stripe](https://stripe.com/) integration with Better Auth
- **Mobile Subscriptions:** [RevenueCat](https://www.revenuecat.com/) for iOS/Android
- **Analytics:** [PostHog](https://posthog.com/) for product analytics
- **Error Tracking:** [Sentry](https://sentry.io/) for monitoring

### Developer Experience

- **Type Safety:** Shared TypeScript configurations
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks

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
│   │   └── eas.json     # EAS Build configuration
│   ├── server/          # Express API server
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
│   ├── eslint/          # Shared ESLint configs
│   ├── prettier/        # Shared Prettier config
│   └── typescript/      # Shared TypeScript configs
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
- **Xcode:** 26.0+
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
3. Place in `apps/native/` directory

#### Android Configuration

1. Create Android app in Firebase Console
2. Download `google-services.json`
3. Place in `apps/native/` directory

#### Backend Service Account

1. Go to Project Settings → Service accounts
2. Generate new private key
3. Save as `google-service-account-file.json` in `packages/api/`

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo)
- Built with tools from the JavaScript ecosystem
