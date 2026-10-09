import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.url().optional(),
    SITE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    HONO_INTERNAL_URL: z.url().optional(),
    HONO_SERVICE_TOKEN: z.string().min(32).optional(),
    RESEND_API_KEY: z.string().optional(),
    PLATFORM_FROM_EMAIL: z.string().min(3).optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {},

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SITE_URL: process.env.SITE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    HONO_INTERNAL_URL: process.env.HONO_INTERNAL_URL,
    HONO_SERVICE_TOKEN: process.env.HONO_SERVICE_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    PLATFORM_FROM_EMAIL: process.env.PLATFORM_FROM_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for one-off diagnostics. CI validates the same contract as production builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION || process.env.npm_lifecycle_event === "lint",
});
