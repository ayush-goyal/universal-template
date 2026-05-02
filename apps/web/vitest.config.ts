import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "@acme/vitest-config/base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        "@/": new URL("./", import.meta.url).pathname,
      },
    },
  })
);
