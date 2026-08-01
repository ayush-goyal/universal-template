import { defineConfig } from "tsup";

export default defineConfig((_options) => ({
  entryPoints: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  noExternal: ["@acme/api", "@acme/db"],
}));
