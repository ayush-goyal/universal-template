import baseConfig from "@acme/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/generated/**",
      "**/prisma/generated/**",
      "**/.turbo/**",
      "**/.cache/**",
      "**/android/**",
      "**/ios/**",
    ],
  },
];
