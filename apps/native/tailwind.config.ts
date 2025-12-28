import type { Config } from "tailwindcss";
// @ts-expect-error - no types
import nativewind from "nativewind/preset";

export default {
  content: ["./app/**/*.{ts,tsx}"],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary-default)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary-default)",
        },
        background: {
          DEFAULT: "var(--color-background)",
          subtle: "var(--color-background-subtle)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
        },
        border: "var(--color-border)",
        card: "var(--color-card)",
        "on-accent": "var(--color-on-accent)",
      },
    },
  },
  plugins: [],
} satisfies Config;
