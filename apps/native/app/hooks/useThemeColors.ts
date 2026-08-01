import { useColorScheme } from "react-native";

import { themeColors } from "@/libs/colors";

/**
 * Returns the theme colors for the current selected theme.
 */
export const useThemeColors = () =>
  useColorScheme() === "dark" ? themeColors.dark : themeColors.light;
