import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@acme/db";

import { POST } from "@/app/api/webhooks/revenuecat/route";
import { refreshRevenueCatProEntitlement } from "@/lib/revenuecat";

vi.mock("@/env", () => ({ env: { REVENUECAT_WEBHOOK_AUTH: "Bearer audit-secret" } }));
vi.mock("@acme/db", () => ({ db: { user: { findMany: vi.fn() } } }));
vi.mock("@/lib/revenuecat", () => ({ refreshRevenueCatProEntitlement: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("RevenueCat webhook", () => {
  function request(body: unknown, authorization = "Bearer audit-secret") {
    return new Request("https://example.test/api/webhooks/revenuecat", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects unauthenticated events without accessing user data", async () => {
    expect((await POST(request({ event: { app_user_id: "user-1" } }, "invalid"))).status).toBe(401);
    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(refreshRevenueCatProEntitlement).not.toHaveBeenCalled();
  });

  it("refreshes both sides of a transfer from the provider", async () => {
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "old-user" },
      { id: "new-user" },
    ] as never);
    const response = await POST(
      request({
        event: {
          type: "TRANSFER",
          transferred_from: ["old-user"],
          transferred_to: ["new-user"],
        },
      })
    );
    expect(response.status).toBe(200);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["old-user", "new-user"] } },
      })
    );
    expect(refreshRevenueCatProEntitlement).toHaveBeenCalledWith("old-user");
    expect(refreshRevenueCatProEntitlement).toHaveBeenCalledWith("new-user");
  });

  it("bounds alias input before doing database work", async () => {
    const response = await POST(
      request({ event: { app_user_id: "user-1", aliases: Array(101).fill("alias") } })
    );
    expect(response.status).toBe(400);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
});
