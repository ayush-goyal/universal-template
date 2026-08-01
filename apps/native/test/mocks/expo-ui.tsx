/**
 * Jest mock for `@expo/ui`.
 *
 * Rendering the real components under Jest throws rather than degrading: jest-expo installs a
 * `globalThis.expo.getViewConfig` polyfill that throws "Method not implemented.", and
 * `@react-native/jest-preset` resolves the `.ios` (SwiftUI) entry points, which call
 * `requireNativeView`. Expo's own `expo-ui/src/__mocks__/expo.ts` swallows string children, and
 * their test suite never renders a universal component, so there is nothing upstream to reuse.
 *
 * These map onto real React Native components so screens stay queryable with the same
 * `getByText` / `getByRole` / `fireEvent.press` idiom as the rest of the suite.
 */
import { Children, isValidElement, ReactNode } from "react";
import { Pressable, Switch as RNSwitch, Text as RNText, View } from "react-native";

type AnyProps = Record<string, any>;

/** Renders as a View, surfacing `title` as text so section headers stay queryable. */
const passthrough = (displayName: string) => {
  const Mock = ({ children, title, ...props }: AnyProps) => (
    <View {...props}>
      {title ? <RNText>{title}</RNText> : null}
      {children}
    </View>
  );
  Mock.displayName = displayName;
  return Mock;
};

export const Host = passthrough("Host");
export const Column = passthrough("Column");
export const Row = passthrough("Row");
export const Spacer = passthrough("Spacer");
export const ScrollView = passthrough("ScrollView");
export const List = passthrough("List");

export const Text = ({ children, ...props }: AnyProps) => <RNText {...props}>{children}</RNText>;

export const Button = ({ children, label, ...props }: AnyProps) => (
  <Pressable accessibilityRole="button" {...props}>
    {label ? <RNText>{label}</RNText> : children}
  </Pressable>
);

export const Switch = ({ label, ...props }: AnyProps) => (
  <View>
    {label ? <RNText>{label}</RNText> : null}
    <RNSwitch {...props} />
  </View>
);

const FieldGroupRoot = passthrough("FieldGroup");
const FieldSection = passthrough("FieldGroup.Section");
const FieldSectionHeader = passthrough("FieldGroup.SectionHeader");
const FieldSectionFooter = passthrough("FieldGroup.SectionFooter");

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldSection,
  SectionHeader: FieldSectionHeader,
  SectionFooter: FieldSectionFooter,
});

/**
 * `Picker` renders its options as pressable rows so a test can select one by label, which the
 * real menu-style picker only exposes through a native popup.
 */
const PickerRoot = ({ children, onValueChange, selectedValue, ...props }: AnyProps) => (
  <View {...props}>
    {Children.map(children, (child: ReactNode) => {
      if (!isValidElement<AnyProps>(child)) return null;
      const { label, value } = child.props;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === selectedValue }}
          onPress={() => onValueChange?.(value)}
        >
          <RNText>{label}</RNText>
        </Pressable>
      );
    })}
  </View>
);

const PickerItem = (_props: AnyProps) => null;

export const Picker = Object.assign(PickerRoot, { Item: PickerItem });
