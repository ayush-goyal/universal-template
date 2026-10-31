---
name: dependency-upgrades
description: Upgrade dependencies in this monorepo without breaking the React split, the hoisted layout, or the native build, and re-check the packages deliberately held back. Lists every hold with the condition that lifts it, the advisories accepted on purpose, and how to verify an upgrade. Use when bumping or auditing dependencies, running pnpm outdated or pnpm audit, upgrading Expo, React Native, React, Next.js, Prisma, Better Auth, or pnpm, or when a hold below may no longer apply.
---

# Upgrading dependencies

Holds and accepted advisories were last reviewed on 2026-10-31. Re-check a hold's condition before
upgrading past it, and update this file when a hold is lifted or added.

## Constraints that shape every upgrade

- **Two React versions, on purpose.** React Native's renderer refuses any React but the exact one it
  was built against: 19.2.3 for Expo SDK 56 and 57. Native and `@acme/auth` use the default
  `catalog:` React; web uses `catalogs.web` (19.2.x, at least 19.2.6 for `vinext`). Web cannot share
  native's version and native cannot move until its Expo SDK does.
- **`react` and `react-dom` must match exactly** wherever both resolve. A package that renders with
  React (React Email in `@acme/auth`) must declare `react-dom` itself, or pnpm fills the peer with
  web's copy and rendering throws "Incompatible React versions".
- **Hoisting.** `node-linker=hoisted` puts one copy of each package at the root. The root
  `package.json` depends on the catalog React so native's copy stays there; check
  `node_modules/react` after an install that touches React.
- **React Native ceiling: 0.87** (team policy: stay a couple of releases behind). No Expo SDK ships
  0.87; SDK 57 is 0.86, SDK 58 is 0.88.
- **The catalog is for dependencies shared by two or more packages.** Single-consumer packages stay
  pinned in their own `package.json`.
- **Use Expo's installer for Expo packages:** `npx expo install --fix` in `apps/native`.

## Finding what to upgrade

```bash
pnpm outdated -r
pnpm audit                                   # needs pnpm 10.7+; older versions run out of memory
cd apps/native && CI=1 npx expo install --check
```

Read release notes and peer ranges (`npm view <pkg>@<version> peerDependencies`) before trusting a
summary. Several plausible advisory IDs and "fixes" turned out not to exist when checked.

## Holds

| Package                                                            | Held at                | Why                                                                                                                                                                                        | Lift when                                                                                                     |
| ------------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Expo SDK 58 / React Native 0.88 / native React 19.3                | SDK 57, RN 0.86.3      | Over the 0.87 ceiling                                                                                                                                                                      | The ceiling policy changes                                                                                    |
| `vinext`                                                           | 1.0.0-beta.9           | 1.2.1+ requires React ^19.3.1, which web cannot take while it matches native's minor; 1.2.0 is the newest that accepts 19.2.x and is an optional beta-to-stable move                       | Web moves to React 19.3                                                                                       |
| Prisma (`prisma`, `@prisma/*`)                                     | exactly 7.8.0          | Team decision. Every adapter pins `@prisma/driver-adapter-utils` exactly, so the packages must move together; npm's `latest` tag points at a Prisma 8 release candidate                    | Planned Prisma upgrade; move all four together and keep Better Auth's `^5 \|\| ^6 \|\| ^7` peer in mind for 8 |
| `pg`                                                               | 8.16                   | 8.19+ logs "client.query() while already executing" deprecation warnings with `@prisma/adapter-pg` 7.8 (prisma/orm#29646, #30925)                                                          | Prisma adapter upgrade                                                                                        |
| `stripe`                                                           | 22.x                   | 23 pins a new major Stripe API version (`2026-10-28.endive`)                                                                                                                               | The Stripe API version change is reviewed against the dashboard webhook endpoint and `@better-auth/stripe`    |
| `@react-native-firebase/*`                                         | 23.8.8                 | 26 makes `initializeAppCheck` synchronous (breaks `app/libs/firebase-app-check.ts`); 27 is Swift Package Manager only, which conflicts with `useFrameworks: static` + `forceStaticLinking` | The iOS build config is reworked for SPM                                                                      |
| `react-native-purchases` (+ `-ui`)                                 | 10.x                   | RevenueCat's 11.0 notes say Expo apps should stay on 10.x                                                                                                                                  | RevenueCat says 11 supports Expo                                                                              |
| `react-native-mmkv` + `react-native-nitro-modules`                 | 4.1.0 + 0.32.0         | MMKV 4.2+ needs Nitro 0.35+, which has a breaking Kotlin change; MMKV 4.3's content check has an open crash (mrousavy/react-native-mmkv#1082)                                              | Move both together after an Android build check                                                               |
| `tailwindcss` (native)                                             | 3.x                    | NativeWind 4 requires Tailwind 3; Tailwind 4 needs NativeWind 5                                                                                                                            | NativeWind 5 is stable                                                                                        |
| `typescript` (native)                                              | ~6.0.3                 | Expo does not support TypeScript 7 yet (expo/expo#47627)                                                                                                                                   | Expo supports TS 7                                                                                            |
| `jest` / `babel` (native)                                          | Jest 29, Babel 7       | `jest-expo` and `babel-preset-expo` require them                                                                                                                                           | A new Expo SDK moves them                                                                                     |
| `oxlint` + `oxlint-tsgolint`                                       | 1.76 + 7.0.2001        | 1.79 removed `react/react-compiler`, so the current `.oxlintrc.json` fails to load; it must be replaced with the split React compiler rules                                                | Someone rewrites the React lint rules                                                                         |
| `vitest`                                                           | 4.x                    | 5 is a major; `@cloudflare/vitest-plugin` supports it only from 1.4.0                                                                                                                      | A deliberate test-tooling upgrade                                                                             |
| `@cloudflare/vite-plugin`, `@cloudflare/vitest-plugin`, `wrangler` | 1.66.0, 1.4.9, 4.154.0 | Each plugin pins `wrangler` exactly; move them only to versions that pin the same `wrangler`, or two copies get installed                                                                  | Always move as a set                                                                                          |
| `@sentry/*`                                                        | 10.x                   | v11 is a major with no needed fix; `@sentry/vite-plugin` 11 is for SDK v11                                                                                                                 | A deliberate Sentry upgrade                                                                                   |
| pnpm                                                               | 10.x                   | pnpm 11 ignores `node-linker` in `.npmrc` (it must move to `pnpm-workspace.yaml` as `nodeLinker`), replaces `onlyBuiltDependencies` with `allowBuilds`, and needs turbo 2.10+              | Those three changes are made together                                                                         |
| `lint-staged`                                                      | 15.x                   | 17 needs Node 22.22.1+, above the `engines` floor of 22.18                                                                                                                                 | `engines` is raised                                                                                           |
| `tsup`                                                             | 9.x                    | Needs Node 22.18+; keep `engines`, `.nvmrc`, and the server Dockerfile in step                                                                                                             | —                                                                                                             |

## Advisories accepted on purpose

Each is pinned upstream and outside code the deployed apps run:

- `deepmerge-ts` 7.1.5 and `mysql2` 3.15.3: pinned by Prisma 7.8's CLI. The MySQL path is never used.
- `zod` 3.25: pinned by the Expo CLI.
- `@grpc/grpc-js` 1.9: pinned by the Firestore web SDK, which the native build does not bundle.
- `nanoid` 3.3.11: locked under `@react-navigation/native`; the advisories need size arguments the
  app never passes.
- `ws` 8.17: React Email's local preview server, which nothing runs.

## Open upstream issues to watch

- React Native 0.86: iOS Release builds hanging on the splash screen
  (react/react-native#57511) and `<React/…>` headers failing under `use_frameworks`
  (react/react-native#57774). Smoke-test a Release build on a device after a native upgrade.
- Xcode 27 / iOS 27 SDK builds need the UIKit scene lifecycle. Expo SDK 57 opts in with
  `"enableSceneSupport": true` under the `expo-build-properties` iOS options; required for App
  Store uploads from April 2027. Test paywall and web-browser flows when enabling it
  (expo/expo#50363).
- Better Auth: `npx auth generate` adds duplicate Prisma relations (better-auth#12134), so edit
  `schema.prisma` by hand. There is no per-phone-number limit on OTP sends (better-auth#11162).
- Prisma: a `PrismaClient` created per request leaks memory in Workers (prisma/orm#29660).

## Verifying an upgrade

`pnpm verify` is not enough on its own here:

1. Delete the incremental TypeScript caches before trusting a typecheck:
   `find . -name tsbuildinfo.json -path "*/.cache/*" -not -path "*/node_modules/*" -delete`, then
   `pnpm check:all --force`. A stale cache once hid a type error that CI caught.
2. After any install that touches React, confirm each location has a matching pair
   (`node_modules`, `apps/web/node_modules`, `apps/native/node_modules`).
3. Web: `pnpm --filter @acme/web build` and `build:cloudflare`.
4. Native: `npx expo export --platform ios --platform android --source-maps` and check the maps
   contain one `node_modules/react`; for native dependency changes, a prebuild and Xcode build
   (`verify-ios`).
5. Server: `docker build -f apps/server/Dockerfile .` and hit `/health`.
