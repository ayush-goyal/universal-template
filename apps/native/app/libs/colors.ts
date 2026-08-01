import { vars } from "nativewind";

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
    destructive: "#ff3b30",
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
    destructive: "#ff453a",
  },
};

export type ThemeColors = typeof themeColors.light;
export type ThemeName = keyof typeof themeColors;

const toTailwindVars = (colors: ThemeColors) =>
  vars({
    "--color-primary-default": colors.primary,
    "--color-secondary-default": colors.secondary,
    "--color-background": colors.background,
    "--color-background-subtle": colors.backgroundSubtle,
    "--color-text": colors.text,
    "--color-text-muted": colors.textMuted,
    "--color-accent": colors.accent,
    "--color-accent-light": colors.accentLight,
    "--color-on-accent": colors.onAccent,
    "--color-border": colors.border,
    "--color-card": colors.card,
    "--color-destructive": colors.destructive,
  });

export const themeColorsTailwind: Record<ThemeName, ReturnType<typeof toTailwindVars>> = {
  light: toTailwindVars(themeColors.light),
  dark: toTailwindVars(themeColors.dark),
};
