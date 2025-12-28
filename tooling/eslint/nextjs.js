import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // Custom overrides
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
]);
