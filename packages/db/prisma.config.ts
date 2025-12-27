import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Use direct URL for migrations (bypasses connection pooler)
    url: env("DATABASE_DIRECT_URL"),
  },
});
