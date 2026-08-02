import { defineConfig } from "vitest/config";

/**
 * Shared Vitest configuration, imported by every package's `vitest.config.ts`.
 *
 * Plain JavaScript rather than TypeScript on purpose. Vite treats a bare specifier that resolves
 * into `node_modules` as external when it bundles a config file, so Node ends up importing this
 * module directly — and Node cannot load `.ts` without type stripping, which is off by default on
 * the Node version this repo pins. Shipping `.js` plus the `.d.ts` next to it keeps both the runtime
 * and the types working.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
