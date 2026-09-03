import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { secureHeaders } from "hono/secure-headers";

import { db } from "@acme/db";

export type ServerBindings = {
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
};

type ServerVariables = {
  requestId: string;
};

type ServerEnv = {
  Bindings: ServerBindings;
  Variables: ServerVariables;
};

export type LogEntry = Record<string, unknown>;

type CreateServerAppOptions = {
  includeTestRoutes?: boolean;
  log?: (entry: LogEntry) => void;
  now?: () => Date;
};

const defaultLog = (entry: LogEntry) => console.log(entry);
const defaultNow = () => new Date();

const readBinding = (bindings: ServerBindings | undefined, name: keyof ServerBindings) => {
  return bindings?.[name] ?? process.env[name];
};

const getAllowedOrigins = (bindings: ServerBindings | undefined) => {
  const environment = readBinding(bindings, "ENVIRONMENT") ?? process.env.NODE_ENV;
  if (environment !== "production") {
    return new Set(["http://localhost:3000", "http://localhost:3001"]);
  }

  return new Set(
    (readBinding(bindings, "ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
};

const requestContext = createMiddleware<ServerEnv>(async (c, next) => {
  const cloudflareRay = c.req.header("cf-ray");
  const requestId =
    cloudflareRay && /^[\dA-Za-z-]{1,128}$/.test(cloudflareRay)
      ? cloudflareRay
      : crypto.randomUUID();

  c.set("requestId", requestId);
  await next();
  c.header("X-Request-Id", requestId);
});

export const createServerApp = (options: CreateServerAppOptions = {}) => {
  const log = options.log ?? defaultLog;
  const now = options.now ?? defaultNow;
  const app = new Hono<ServerEnv>();

  app.use("*", requestContext);
  app.use("*", async (c, next) => {
    const startedAt = performance.now();
    await next();

    log({
      event: "http.request",
      requestId: c.get("requestId"),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Math.max(0, performance.now() - startedAt),
      environment: readBinding(c.env, "ENVIRONMENT") ?? process.env.NODE_ENV ?? "development",
      cloudflareRay: c.req.header("cf-ray") ?? null,
    });
  });
  app.use(
    "*",
    secureHeaders({
      crossOriginResourcePolicy: "cross-origin",
    })
  );
  app.use("*", async (c, next) => {
    const allowedOrigins = getAllowedOrigins(c.env);
    return cors({
      origin: (origin) => (allowedOrigins.has(origin) ? origin : ""),
      allowMethods: ["GET", "HEAD", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id"],
      credentials: true,
      maxAge: 86_400,
    })(c, next);
  });

  app.get("/", async (c) =>
    c.json({
      message: "Hello World",
      userCount: await db.user.count(),
    })
  );

  app.get("/health", (c) =>
    c.json({
      status: "healthy",
      timestamp: now().toISOString(),
    })
  );

  if (options.includeTestRoutes) {
    app.get("/__test/error", () => {
      throw new Error("test-only failure");
    });
  }

  app.notFound((c) =>
    c.json(
      {
        message: "Endpoint not found",
        requestId: c.get("requestId"),
      },
      404
    )
  );

  app.onError((error, c) => {
    log({
      event: "http.error",
      requestId: c.get("requestId"),
      error,
    });

    return c.json(
      {
        message: "Internal server error",
        requestId: c.get("requestId"),
      },
      500
    );
  });

  return app;
};

const app = createServerApp();

export default app;
