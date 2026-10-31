---
name: dependency-upgrades
description: Upgrade dependencies without breaking the web/native React split, the hoisted layout, or the native build, and re-check the packages deliberately held back. Lists each hold with the date it was checked and what lifts it, plus accepted advisories and how to verify an upgrade. Use when bumping or auditing dependencies, running pnpm outdated or pnpm audit, or upgrading Expo, React Native, React, Next.js, Prisma, Better Auth, or pnpm.
---

# Upgrading dependencies

## Ask first

Patch and minor bumps inside the constraints below can go ahead. **Ask the user before** any major
version, any Expo SDK or React Native upgrade, any React version change, lifting a hold, or raising
the iOS or Android minimum. Bring the release notes, peer ranges, and what breaks.

## Constraints

- **Two Reacts.** React Native's renderer requires the exact React its SDK ships (19.2.3 on Expo
  SDK 57). Native and `@acme/auth` use the default catalog React; web uses `catalogs.web` (19.2.x,
  ≥19.2.6 for `vinext`). Any package that renders React must declare `react-dom` too.
- **Hoisting.** With `node-linker=hoisted`, the root `package.json` depends on the catalog React so
  native's copy stays at the top of `node_modules`.
- **React Native ceiling: 0.87.** Team policy is to stay a couple of releases behind. No Expo SDK
  ships 0.87; SDK 57 is 0.86, SDK 58 is 0.88.
- **iOS minimum 26.0** (Liquid Glass). `enableSceneSupport` in `app.json` is required for Xcode 27
  builds to launch on iOS 27 (local `eas build --local`, or EAS `latest`); remove it on SDK 58.
- **Catalog** only for dependencies used by two or more packages. **Expo packages** through
  `npx expo install --fix` in `apps/native`.

## Finding upgrades

```bash
pnpm outdated -r
pnpm audit
cd apps/native && CI=1 npx expo install --check
```

Check release notes and `npm view <pkg>@<version> peerDependencies` yourself; summaries have cited
advisories that do not exist.

## Holds

| Package                                            | Held at                | Why                                                                                                             | Lift when                                             | Checked    |
| -------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------- |
| Expo SDK 58 / RN 0.88 / native React 19.3          | SDK 57                 | Over the RN ceiling                                                                                             | Ceiling changes                                       | 2026-10-31 |
| `vinext`                                           | 1.0.0-beta.9           | 1.2.1+ needs React ^19.3.1; 1.2.0 is an optional beta-to-stable move                                            | Web moves to React 19.3                               | 2026-10-31 |
| Prisma (all `prisma`/`@prisma/*`)                  | exactly 7.8.0          | Team decision; adapters pin `driver-adapter-utils` exactly, so all move together. npm `latest` is a Prisma 8 RC | Planned Prisma upgrade                                | 2026-10-31 |
| `pg`                                               | 8.16                   | 8.19+ logs deprecation warnings with `adapter-pg` 7.8 (prisma/orm#29646)                                        | Prisma upgrade                                        | 2026-10-31 |
| `stripe`                                           | 22.x                   | 23 pins a new major Stripe API version                                                                          | API version reviewed against webhooks                 | 2026-10-31 |
| `@react-native-firebase/*`                         | 23.8.8                 | 26 makes `initializeAppCheck` sync; 27 is SPM-only, conflicting with `useFrameworks: static`                    | iOS build reworked for SPM                            | 2026-10-31 |
| `react-native-purchases` (+ `-ui`)                 | 10.x                   | RevenueCat says Expo apps stay on 10.x                                                                          | RevenueCat supports Expo on 11                        | 2026-10-31 |
| `react-native-mmkv` + `nitro-modules`              | 4.1.0 + 0.32.0         | MMKV 4.2+ needs Nitro 0.35+ (breaking Kotlin change)                                                            | Move together after an Android build                  | 2026-10-31 |
| Native `tailwindcss` / `typescript` / Jest / Babel | 3 / ~6.0 / 29 / 7      | NativeWind 4, Expo, and `jest-expo` require them                                                                | Expo or NativeWind moves                              | 2026-10-31 |
| `oxlint` + `oxlint-tsgolint`                       | 1.76 + 7.0.2001        | 1.79 removed `react/react-compiler`; `.oxlintrc.json` must switch to the split rules                            | Lint rules rewritten                                  | 2026-10-31 |
| `vitest`                                           | 4.x                    | 5 is a major                                                                                                    | Deliberate test-tooling upgrade                       | 2026-10-31 |
| Cloudflare plugins + `wrangler`                    | 1.66.0, 1.4.9, 4.154.0 | Each plugin pins `wrangler` exactly                                                                             | Move as a set to versions pinning the same `wrangler` | 2026-10-31 |
| `@sentry/*`                                        | 10.x                   | v11 is a major with nothing needed                                                                              | Deliberate Sentry upgrade                             | 2026-10-31 |
| pnpm                                               | 10.x                   | 11 needs `nodeLinker` moved into `pnpm-workspace.yaml`, `allowBuilds`, and turbo 2.10+                          | Those changes are made together                       | 2026-10-31 |
| `lint-staged`                                      | 15.x                   | 17 needs Node 22.22.1+, above `engines`                                                                         | `engines` raised                                      | 2026-10-31 |

## Accepted advisories (checked 2026-10-31)

Pinned upstream, outside code the apps run: `deepmerge-ts` and `mysql2` (Prisma 7.8 CLI), `zod` 3
(Expo CLI), `@grpc/grpc-js` 1.9 (Firestore web SDK, not bundled), `nanoid` 3.3.11 (locked under
React Navigation), `ws` 8.17 (React Email preview server).

## Watch (checked 2026-10-31)

- RN 0.86 Release-only splash hang (react/react-native#57511): smoke-test Release on a device.
- `enableSceneSupport` can make `currentViewController()` unreliable (expo/expo#50363): test the
  RevenueCat paywall and `expo-web-browser` flows.
- `npx auth generate` corrupts Prisma relations (better-auth#12134): edit `schema.prisma` by hand.
- No per-phone-number OTP send limit (better-auth#11162).
- Per-request `PrismaClient` leaks memory in Workers (prisma/orm#29660).

## Verifying

1. Clear incremental caches, then run everything:
   `find . -name tsbuildinfo.json -path "*/.cache/*" -not -path "*/node_modules/*" -delete && pnpm check:all --force`.
   A stale cache once hid a type error that CI caught.
2. After touching React, confirm matching `react`/`react-dom` in `node_modules`,
   `apps/web/node_modules`, and `apps/native/node_modules`.
3. Web: `pnpm --filter @acme/web build` and `build:cloudflare`.
4. Native: `npx expo export --platform ios --platform android --source-maps` (one
   `node_modules/react` in the maps); for native changes, prebuild, build, and launch per
   `verify-ios`.
5. Server: `docker build -f apps/server/Dockerfile .`, then hit `/health`.

When a hold is lifted or added, update its row and date.
