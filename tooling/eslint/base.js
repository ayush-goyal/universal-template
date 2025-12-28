import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // Ignores
  {
    ignores: [
      "**/*.config.js",
      "**/*.config.cjs",
      "**/.eslintrc.cjs",
      "**/.next/**",
      "**/.turbo/**",
      "**/.cache/**",
      "**/dist/**",
      "**/generated/**",
      "prisma/generated/**",
      "pnpm-lock.yaml",
    ],
  },

  // Extend recommended configs first
  ...tseslint.configs.recommended,

  // Base config with rule overrides (comes after recommended to override)
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },

    plugins: {
      "@typescript-eslint": tseslint.plugin,
      import: importPlugin,
      "unused-imports": unusedImports,
    },

    rules: {
      // TypeScript specific
      "@typescript-eslint/no-unused-vars": "off", // Handled by unused-imports
      "@typescript-eslint/no-explicit-any": "off", // Allow using explicit any
      "@typescript-eslint/no-namespace": "off", // Allow using namespace
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",

      // Unused imports and variables
      "no-unused-vars": "off", // Turn off base rule as it conflicts with unused-imports
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // Other rules
      "no-use-before-define": "off",
      "no-restricted-imports": ["error"],
      "import/order": "off",
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  }
);
