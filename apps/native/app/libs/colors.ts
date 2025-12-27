export const themeColors = {
  light: {
    primary: "#1f1f1f",
    secondary: "#4a4a4a",
    background: "#ffffff",
    backgroundSubtle: "#e8e8e8",
    text: "#000000",
    textMuted: "#666666",
    accent: "#356554",
    accentLight: "#489d7f",
    onAccent: "#fefefe",
    border: "#e0e0e0",
    card: "#eee",
  },
  dark: {
    primary: "#ffffff",
    secondary: "#cccccc",
    background: "#000000",
    backgroundSubtle: "#1a1a1a",
    text: "#ffffff",
    textMuted: "#b3b3b3",
    accent: "#356554",
    accentLight: "#489d7f",
    onAccent: "#fefefe",
    border: "#333333",
    card: "#0d0d0d",
  },
};

export type ThemeColors = typeof themeColors.light;
