import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
    }),
  ],
  test: {
    include: ["src/**/*.workerd.test.ts"],
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ["@acme/db", "@prisma/adapter-pg", "pg", "pg-connection-string", "pg-protocol"],
          rolldownOptions: {
            external: [
              /^(?:node:)?(?:assert|async_hooks|buffer|crypto|dns|events|fs|module|net|os|path|process|stream|string_decoder|tls|url|util|zlib)$/,
            ],
          },
        },
      },
    },
  },
});
