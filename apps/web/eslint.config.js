import baseConfig from "@acme/eslint-config/base";
import reactConfig from "@acme/eslint-config/react";
import nextjsConfig from "@acme/eslint-config/nextjs";

export default [
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
];

