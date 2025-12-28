import React, { createContext, useContext } from "react";
import { View } from "react-native";

import { themeColors, themeColorsTailwind } from "@/libs/colors";

interface ThemeProviderProps {
  children: React.ReactNode;
}
export const ThemeContext = createContext<{
  theme: "light" | "dark";
}>({
  theme: "light",
});
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ theme: "light" }}>
      <View style={themeColorsTailwind["light"]} className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export const useThemeColors = () => {
  const { theme } = useContext(ThemeContext);
  return themeColors[theme];
};
