import React from "react";
import { useColorScheme } from "react-native";
import { VariableContextProvider } from "nativewind";

import { themeColors } from "@/libs/colors";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = scheme === "dark" ? themeColors.dark : themeColors.light;

  return <VariableContextProvider value={value}>{children}</VariableContextProvider>;
}
export const useThemeColors = () => {
  const scheme = useColorScheme();
  const value = scheme === "dark" ? themeColors.dark : themeColors.light;

  return value;
};
