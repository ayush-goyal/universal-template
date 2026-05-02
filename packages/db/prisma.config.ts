import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Use direct URL for migrations (bypasses connection pooler)
    url: process.env.DATABASE_DIRECT_URL,
  },
});
