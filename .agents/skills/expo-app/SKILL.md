---
name: expo-app
description: Add or edit a screen in the Expo React Native app at apps/native. Covers the app/ directory layout, registering a screen in both NavigationTypes and AppNavigator, typed navigation props, NativeWind styling, calling tRPC, Zustand stores, Reanimated, and the Jest setup. Use when adding a screen, navigator, or mobile component, wiring mobile navigation, or working anywhere under apps/native.
paths:
  - "apps/native/**"
---

# Adding a screen in apps/native

Screens are written by hand; there is no generator. Both registrations below are required.

## There is no src/ directory

Code lives in `apps/native/app/`, and `@/*` maps to `apps/native/app/*`. Older docs elsewhere
reference `apps/native/src/utils/api.ts`; that path does not exist.

```
apps/native/app/
├── screens/<Feature>/<Name>Screen.tsx
├── navigators/        AppNavigator.tsx, NavigationTypes.tsx
├── components/        StyledText, PageWrapper, XStack, YStack
├── contexts/          Auth, TRPC, Notification, RevenueCat
├── libs/              trpc.ts, auth-client.ts, stores/
└── i18n/
```

## Registration is two files, not one

A screen is reachable only after **both** edits. Missing the first gives untyped `route.params`;
missing the second fails at runtime with no compile error.

1. `app/navigators/NavigationTypes.tsx` — add the route to the relevant param list, `undefined` when
   it takes no params:

```ts
export type HomeTabStackParamList = {
  Home: undefined;
  ThingDetail: { thingId: string };
};
```

2. `app/navigators/AppNavigator.tsx` — add a `<Stack.Screen>` to the matching navigator.

The tree: unauthenticated users get `AuthStack` (Welcome → PhoneNumberInput → VerifyCode);
authenticated users get `RootStack` → `MainBottomTabs` → `HomeTab`. `AppNavigator` picks off
`useAuth()`.

## Screen shape

Type props with the param-list helper for the screen's navigator, so `navigation` and `route.params`
are both typed:

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

## Native UI vs NativeWind

Decide per subtree, never per prop — the `Host` boundary is hard, so React Native children can't
live inside it and NativeWind can't style across it. Full detail in the `expo-ui` skill.

- **`@expo/ui` inside a `Host`** where you want the OS look: grouped settings forms, pickers,
  switches, native lists. `SettingsScreen` is the reference.
- **NativeWind + React Native** for brand UI, and for anything containing non-`@expo/ui`
  children (`ActivityIndicator`, `CodeField`, lucide icons) or that must survive a crashed tree.
- A `Host` needs no `colorScheme` prop: the theme is a native appearance override, so SwiftUI
  inherits it from the window.

### One Tailwind vocabulary on both sides of the `Host`

Import `@expo/ui` from `@/components/native-ui`, never `@expo/ui` directly — that module registers
NativeWind's `cssInterop`, so `className` works in both trees:

```tsx
<Host className="flex-1">
  <Text className="text-text-muted">{user.email}</Text>
</Host>
```

NativeWind resolves the class in JS and lands it on `textStyle` (colour, font, alignment) or `style`
(padding, background, border, size); `@expo/ui` turns those into SwiftUI modifiers on iOS and
Compose modifiers on Android. One class, both platforms, no file split. Variables resolve before the
boundary, so themed classes follow the theme toggle. `__tests__/unit/native-ui.test.tsx` pins it.

- `Row` / `Column` take only the universal style subset — `flex-1` and `gap-2` are silently dropped.
  Use their `spacing` / `alignment` props and put layout on `Host`, which is a real RN view.
- `text-sm` is 12.25pt: NativeWind's rem is 14px on native. Both trees agree, which is the point.
- For what Tailwind cannot express (hierarchical text, `PlatformColor`, `glassEffect`) use
  `modifiers` — a supplied modifier replaces the style-derived one of the same type.
- New colours go in `app/libs/colors.ts` so both trees and web stay on one palette.

## Screens in a stack must scroll

A screen whose navigator sets `headerLargeTitleEnabled` needs a `ScrollView` (or `FlatList`) as
its **direct** child with `contentInsetAdjustmentBehavior="automatic"`. UIKit only applies the
header and native tab bar insets to a scroll view it can find, and only then does the large title
collapse instead of painting over the content. Put padding on `contentContainerStyle` /
`contentContainerClassName`, not the scroll view.

Don't reach for `useSafeAreaInsets()` to solve this: `SafeAreaProvider` is mounted at the app root,
so it reports window insets and knows nothing about the header or tab bar. `@react-navigation/bottom-tabs/unstable`
exports no `useBottomTabBarHeight` either. Let UIKit do it.

## Theming has one source of truth

`@vonovak/react-native-theme-control` applies the user's choice as a native appearance override and
persists it, so `useColorScheme()` already reports the effective scheme — there is no theme context
or provider to read, and nothing to thread through props. React Navigation, native stack headers,
the tab bar, and `@expo/ui` hosts all follow the override on their own.

- Read the palette with `useThemeColors()` from `@/hooks/useThemeColors`, a two-line wrapper over
  `useColorScheme()`. Never hardcode `themeColors.light`.
- Change it with `setThemePreference("light" | "dark" | "system")`, and read the raw choice with
  `useThemePreference()`, both from the library. Do not mirror the preference into a store.
- `app.tsx` owns the only three global pieces: the `vars()` style carrying the CSS variables every
  `className` resolves against, `AppBackground` for the window behind the React tree, and
  `SystemBars` for the status bar.
- Do not add `expo-system-ui`. Its config plugin throws when that package is resolvable, since the
  two overlap.

## Conventions

- **Styling**: NativeWind via `className`. Prefer semantic tokens (`bg-background`, `bg-accent`,
  `text-on-accent`) over raw colours so dark mode works.
- **Text**: `StyledText`, not bare `Text`, so font and theme colour apply.
- **Data**: `useTRPC()` from `@/libs/trpc` plus TanStack Query, same options-proxy pattern as web.
- **Client state**: Zustand in `@/libs/stores`. Server state belongs in React Query.
- **Animation**: Reanimated. **Safe area**: `SafeAreaView` with explicit `edges`.
- **Dependencies**: the `expo` MCP server's `add_library` tool or `expo install`, never bare
  `pnpm add` — both resolve the version matching the installed SDK.
- **Checking your work**: `verify-ios` covers simulator screenshots, taps, and logs.

## Gotchas

- Tests here are **Jest** (`jest-expo`, `apps/native/__tests__/`) while every other package uses
  Vitest — never import from `vitest`; run `pnpm --filter @acme/native test`. RNTL 14 uses React 19's
  async APIs, so always await `render`, `renderHook`, `fireEvent`, `act`, rerender, and unmount.
  Maestro smoke flows (`test:e2e`) are intentionally separate from the Jest gate.
- `@acme/native` has **no `build` script** and is not in the turbo build pipeline; `pnpm build`
  legitimately ignores it.
- Dev client, not Expo Go. After adding a native dependency run
  `pnpm --filter @acme/native prebuild:clean`, then rebuild.
- `ios/` and `android/` are gitignored generated directories. Change `app.json` or the config
  plugins instead.
- The API is reached over `Config.SITE_URL + "/api/trpc"` from `app/config`, using `httpLink` and
  forwarding Better Auth cookies in `contexts/TRPCContext.tsx`. On a physical Android device run
  `pnpm --filter @acme/native adb` to forward ports, or localhost will not resolve.
- Firebase credential files (`GoogleService-Info.plist`, `google-services.json`) are gitignored and
  belong in `apps/native/config/`.
