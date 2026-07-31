---
name: expo-app
description: Add or edit a screen in the Expo React Native app at apps/native. Covers the app/ directory layout, registering a screen in both NavigationTypes and AppNavigator, typed navigation props, NativeWind styling, calling tRPC, Zustand stores, Reanimated, and the Jest test setup. Use when adding a screen, navigator, or mobile component, wiring mobile navigation, or working anywhere under apps/native.
paths:
  - "apps/native/**"
---

# Adding a screen in apps/native

`pnpm gen native-screen` creates the screen and performs both registrations below.

## There is no src/ directory

Code lives in `apps/native/app/`, and the `@/*` alias maps to `apps/native/app/*` — **not** to a
`src/`. Older docs elsewhere referenced `apps/native/src/utils/api.ts`; that path does not exist.

```
apps/native/app/
├── screens/<Feature>/<Name>Screen.tsx
├── navigators/        AppNavigator.tsx, NavigationTypes.tsx
├── components/        StyledText, PageWrapper, XStack, YStack
├── contexts/          Auth, TRPC, Theme, Notification, RevenueCat
├── libs/              trpc.ts, auth-client.ts, stores/
└── i18n/
```

## Registration is two files, not one

A screen is only reachable after **both** edits. Missing the first gives untyped `route.params`;
missing the second means navigation fails at runtime with no compile error.

1. `app/navigators/NavigationTypes.tsx` — add the route to the relevant param list, with `undefined`
   when it takes no params:

```ts
export type HomeTabStackParamList = {
  Home: undefined;
  ThingDetail: { thingId: string };
};
```

2. `app/navigators/AppNavigator.tsx` — add a `<Stack.Screen>` to the matching navigator.

The navigator tree is: unauthenticated users get `AuthStack` (Welcome → PhoneNumberInput →
VerifyCode); authenticated users get `RootStack` → `MainBottomTabs` → `HomeTab`. `AppNavigator`
picks between them off `useAuth()`.

## Screen shape

Type props with the param-list helper for the navigator the screen belongs to, so `navigation` and
`route.params` are both typed:

```tsx
import { FC } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import StyledText from "@/components/StyledText";
import { useTRPC } from "@/libs/trpc";
import { HomeTabStackScreenProps } from "@/navigators/NavigationTypes";

type ThingDetailScreenProps = HomeTabStackScreenProps<"ThingDetail">;

export const ThingDetailScreen: FC<ThingDetailScreenProps> = ({ route }) => {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.getThing.queryOptions({ id: route.params.thingId }));

  return (
    <SafeAreaView edges={["bottom"]} className="bg-background flex-1">
      <View className="flex-1 px-6 pt-4">
        <StyledText className="text-2xl font-bold">{data?.name}</StyledText>
      </View>
    </SafeAreaView>
  );
};
```

## Conventions

- **Styling**: NativeWind — Tailwind classes via `className`. Semantic tokens like `bg-background`,
  `bg-accent`, `text-on-accent` come from the theme; prefer them over raw colors so dark mode works.
- **Text**: use `StyledText` from `@/components/StyledText`, not bare `Text`, so font and theme
  colour apply.
- **Data**: `useTRPC()` from `@/libs/trpc` plus TanStack Query, same options-proxy pattern as web.
- **Client state**: Zustand, in `@/libs/stores`. Server state belongs in React Query, not Zustand.
- **Animation**: React Native Reanimated.
- **Safe area**: `SafeAreaView` from `react-native-safe-area-context` with explicit `edges`.

## Gotchas

- Tests here are **Jest** (`jest-expo` preset, `apps/native/__tests__/`), while every other package
  uses Vitest. Do not import `vi`, `describe` from `vitest` in this app; run
  `pnpm --filter @acme/native test`.
- `@acme/native` has **no `build` script** and is not part of the turbo build pipeline. `pnpm build`
  legitimately ignores it.
- This is an Expo **dev client**, not Expo Go. After adding a native dependency run
  `pnpm --filter @acme/native prebuild:clean`, then rebuild.
- `ios/` and `android/` are gitignored generated directories. Never edit them by hand; change
  `app.config.ts` or the config plugins instead.
- The app reaches the API over `Config.SITE_URL + "/api/trpc"` from `app/config`, using `httpLink`
  and forwarding Better Auth cookies in `contexts/TRPCContext.tsx`. On a physical Android device run
  `pnpm --filter @acme/native adb` to forward ports, or localhost will not resolve.
- Firebase credential files (`GoogleService-Info.plist`, `google-services.json`) are gitignored and
  belong in `apps/native/config/`.
