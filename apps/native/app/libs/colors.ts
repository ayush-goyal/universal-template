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

// Associated tailwind variables must be set in tailwind.config.ts as well
export const themeColorsTailwind = {
  light: vars({
    "--color-primary-default": themeColors.light.primary,
    "--color-secondary-default": themeColors.light.secondary,
    "--color-background": themeColors.light.background,
    "--color-background-subtle": themeColors.light.backgroundSubtle,
    "--color-text": themeColors.light.text,
    "--color-text-muted": themeColors.light.textMuted,
    "--color-accent": themeColors.light.accent,
    "--color-accent-light": themeColors.light.accentLight,
    "--color-on-accent": themeColors.light.onAccent,
    "--color-border": themeColors.light.border,
    "--color-card": themeColors.light.card,
  }),
  dark: vars({
    "--color-primary-default": themeColors.dark.primary,
    "--color-primary-light": themeColors.dark.secondary,
    "--color-secondary-default": themeColors.dark.secondary,
    "--color-secondary-light": themeColors.dark.textMuted,
    "--color-background": themeColors.dark.background,
    "--color-background-subtle": themeColors.dark.backgroundSubtle,
    "--color-text": themeColors.dark.text,
    "--color-text-muted": themeColors.dark.textMuted,
    "--color-accent": themeColors.dark.accent,
    "--color-accent-light": themeColors.dark.accentLight,
    "--color-on-accent": themeColors.dark.onAccent,
    "--color-border": themeColors.dark.border,
    "--color-card": themeColors.dark.card,
  }),
};

export type ThemeColors = typeof themeColors.light;
