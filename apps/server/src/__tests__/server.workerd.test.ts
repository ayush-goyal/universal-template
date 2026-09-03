import { describe, expect, it } from "vitest";

import server from "../app";

describe("Hono server in workerd", () => {
  it("serves the liveness endpoint", async () => {
    const response = await server.request("https://server.example.com/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "healthy",
      timestamp: expect.any(String),
    });
  });
});
