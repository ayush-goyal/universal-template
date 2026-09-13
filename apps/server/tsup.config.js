import { defineConfig } from "tsup";

export default defineConfig((_options) => ({
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  entryPoints: ["src/server.node.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  noExternal: ["@acme/db", "@hono/node-server", "hono"],
  platform: "node",
}));
