import { defineConfig } from "tsup";

export default defineConfig(() => ({
  entryPoints: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  // Inline internal workspace packages so the server ships a single bundle.
  noExternal: ["@acme/api", "@acme/db"],
  // Keep native/CJS runtime deps external. tsup's CJS->ESM interop cannot
  // handle dynamic require() inside these packages (e.g. `pg`'s dynamic
  // require of "events", or Prisma's wasm query compiler loader). They are
  // installed into the deployed node_modules by `pnpm deploy --prod`.
  external: ["pg", "@prisma/client", "@prisma/adapter-pg"],
}));
