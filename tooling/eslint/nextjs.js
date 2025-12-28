import { fixupPluginRules } from "@eslint/compat";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    plugins: {
      "@next/next": fixupPluginRules(nextPlugin),
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
];
