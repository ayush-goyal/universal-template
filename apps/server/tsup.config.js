import { defineConfig } from "tsup";

export default defineConfig((_options) => ({
  entryPoints: ["src/server.node.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  noExternal: ["@acme/db"],
}));
