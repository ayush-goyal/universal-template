import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { hasServiceAuthorization, requireServiceAuth } from "./index";

const createInternalApp = () => {
  const app = new Hono<{ Bindings: { HONO_SERVICE_TOKEN?: string } }>();
  app.use("/internal/*", requireServiceAuth);
  app.post("/internal/action", (c) => c.json({ authorized: true }));
  return app;
};

describe("Hono service authentication", () => {
  it("accepts only an exact bearer credential", () => {
    expect(hasServiceAuthorization("Bearer secret-token", "secret-token")).toBe(true);
    expect(hasServiceAuthorization(undefined, "secret-token")).toBe(false);
    expect(hasServiceAuthorization("secret-token", "secret-token")).toBe(false);
    expect(hasServiceAuthorization("Basic secret-token", "secret-token")).toBe(false);
    expect(hasServiceAuthorization("Bearer secret-token-extra", "secret-token")).toBe(false);
    expect(hasServiceAuthorization("bearer secret-token", "secret-token")).toBe(false);
  });

  it("rejects missing configuration and unauthenticated internal requests", async () => {
    const app = createInternalApp();
    const unconfigured = await app.request(
      "/internal/action",
      { method: "POST" },
      { HONO_SERVICE_TOKEN: "" }
    );
    expect(unconfigured.status).toBe(503);

    const bindings = { HONO_SERVICE_TOKEN: "secret-token" };
    const missing = await app.request("/internal/action", { method: "POST" }, bindings);
    expect(missing.status).toBe(401);

    const wrong = await app.request(
      "/internal/action",
      { method: "POST", headers: { Authorization: "Bearer wrong-token" } },
      bindings
    );
    expect(wrong.status).toBe(401);
  });

  it("allows the configured service credential", async () => {
    const response = await createInternalApp().request(
      "/internal/action",
      { method: "POST", headers: { Authorization: "Bearer secret-token" } },
      { HONO_SERVICE_TOKEN: "secret-token" }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authorized: true });
  });
});
