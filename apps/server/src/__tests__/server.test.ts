import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LogEntry, ServerBindings } from "../app";
import { createServerApp } from "../app";

const { userCount } = vi.hoisted(() => ({
  userCount: vi.fn(),
}));
vi.mock("@acme/db", () => ({
  db: {
    user: {
      count: userCount,
    },
  },
}));

const productionBindings: ServerBindings = {
  ALLOWED_ORIGINS: "https://app.example.com",
  ENVIRONMENT: "production",
};

describe("Hono server", () => {
  let logs: LogEntry[];

  beforeEach(() => {
    userCount.mockReset();
    userCount.mockResolvedValue(42);
    logs = [];
  });

  const createApp = () =>
    createServerApp({
      includeTestRoutes: true,
      log: (entry) => logs.push(entry),
      now: () => new Date("2026-01-02T03:04:05.000Z"),
    });

  it("serves a database example and keeps liveness independent", async () => {
    const app = createApp();

    const root = await app.request("/", undefined, productionBindings);
    expect(root.status).toBe(200);
    await expect(root.json()).resolves.toEqual({
      message: "Hello World",
      userCount: 42,
    });
    expect(userCount).toHaveBeenCalledOnce();

    const health = await app.request("/health", undefined, productionBindings);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({
      status: "healthy",
      timestamp: "2026-01-02T03:04:05.000Z",
    });
    expect(userCount).toHaveBeenCalledOnce();
  });

  it("applies request IDs, security headers, structured logs, and redacted errors", async () => {
    const app = createApp();
    const response = await app.request(
      "/__test/error?secret=do-not-log",
      {
        headers: {
          Authorization: "Bearer do-not-log",
          "cf-ray": "abc123-SJC",
        },
      },
      productionBindings
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("abc123-SJC");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({
      message: "Internal server error",
      requestId: "abc123-SJC",
    });

    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain("do-not-log");
    expect(logs).toContainEqual(
      expect.objectContaining({
        event: "http.request",
        method: "GET",
        path: "/__test/error",
        status: 500,
      })
    );
  });

  it("uses an exact credentialed CORS allowlist", async () => {
    const app = createApp();
    const allowed = await app.request(
      "/health",
      { headers: { Origin: "https://app.example.com" } },
      productionBindings
    );
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");

    const denied = await app.request(
      "/health",
      { headers: { Origin: "https://evil.example" } },
      productionBindings
    );
    expect(denied.headers.get("access-control-allow-origin")).not.toBe("https://evil.example");

    const preflight = await app.request(
      "/health",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://app.example.com",
          "Access-Control-Request-Method": "GET",
        },
      },
      productionBindings
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });

  it("returns a stable not-found response", async () => {
    const response = await createApp().request(
      "/this-does-not-exist",
      undefined,
      productionBindings
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      message: "Endpoint not found",
      requestId: expect.any(String),
    });
  });
});
