import { Column as UIColumn, Host as UIHost, Row as UIRow, Text as UIText } from "@expo/ui";
import { cssInterop } from "nativewind";

/**
 * `@expo/ui` with NativeWind wired up, so one set of Tailwind classes styles both the React Native
 * tree and the native tree. Import from here rather than `@expo/ui`.
 *
 * `className` resolves to a style object in JS and lands on `textStyle` / `style`, which `@expo/ui`
 * translates into SwiftUI modifiers on iOS and Jetpack Compose modifiers on Android. Resolution
 * happens before the `Host` boundary, which is how theme variables reach SwiftUI at all.
 *
 * `modifiers` still wins per type, so it stays the escape hatch for OS-semantic styling.
 */
export * from "@expo/ui";

export const Text = cssInterop(UIText, { className: "textStyle" });

export const Host = cssInterop(UIHost, { className: "style" });

export const Row = cssInterop(UIRow, { className: "style" });
export const Column = cssInterop(UIColumn, { className: "style" });
