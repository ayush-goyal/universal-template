import testingLibrary from "eslint-plugin-testing-library";

import baseConfig from "@acme/eslint-config/base";
import reactConfig from "@acme/eslint-config/react";

export default [
  ...baseConfig,
  ...reactConfig,
  {
    ignores: ["coverage/**", "expo-plugins/**"],
  },
  {
    files: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    ...testingLibrary.configs["flat/react"],
  },
];
