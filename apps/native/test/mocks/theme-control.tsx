import type { ThemePreference } from "@vonovak/react-native-theme-control";

let preference: ThemePreference = "system";

export const setThemePreference = jest.fn((next: ThemePreference) => {
  preference = next;
});

export const getThemePreference = () => preference;

export const useThemePreference = () => preference;

export const resetThemeControlMock = () => {
  preference = "system";
  setThemePreference.mockClear();
};

export const AppBackground = () => null;
export const SystemBars = () => null;
export const ThemeAwareStatusBar = () => null;
export const NavigationBar = () => null;
export const setAppBackground = jest.fn();
export const setNavbarAppearance = jest.fn();
