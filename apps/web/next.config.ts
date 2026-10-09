import { fileURLToPath } from "url";
import type { NextConfig } from "next";
import createJiti from "jiti";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
createJiti(fileURLToPath(import.meta.url))("./env");

const config: NextConfig = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@acme/api", "@acme/db", "@acme/auth", "@acme/shared"],

  experimental: {
    useTypeScriptCli: true,
  },

  turbopack: {
    // Turbopack automatically handles transpilation of packages listed in transpilePackages
  },
};

export default config;
