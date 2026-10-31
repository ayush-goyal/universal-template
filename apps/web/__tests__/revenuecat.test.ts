import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@acme/db";

import { refreshRevenueCatProEntitlement } from "@/lib/revenuecat";

const testEnv = vi.hoisted(() => ({
  NODE_ENV: "production",
  REVENUECAT_PROJECT_ID: "audit-project",
  REVENUECAT_SECRET_API_KEY: "audit-placeholder",
}));

vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: testEnv }));
vi.mock("@acme/db", () => ({ db: { revenueCatEntitlement: { upsert: vi.fn() } } }));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  testEnv.NODE_ENV = "production";
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function subscription(environment: "production" | "sandbox") {
  return {
    environment,
    product_id: `${environment}-product`,
    current_period_ends_at: Date.now() + 60_000,
    gives_access: true,
    store: "app_store",
    entitlements: { items: [{ lookup_key: "pro" }] },
  };
}

describe("RevenueCat subscription access", () => {
  it.each(["production", "sandbox"] as const)(
    "accepts verified %s purchases on the shared production backend",
    async (environment) => {
      fetchMock.mockResolvedValue(Response.json({ items: [subscription(environment)] }));

      await refreshRevenueCatProEntitlement("user-1");

      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.searchParams.has("environment")).toBe(false);
      expect(db.revenueCatEntitlement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isActive: true, productId: `${environment}-product` }),
          update: expect.objectContaining({ isActive: true, productId: `${environment}-product` }),
        })
      );
    }
  );

  it("does not grant access for an inactive sandbox subscription", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ items: [{ ...subscription("sandbox"), gives_access: false }] })
    );

    await refreshRevenueCatProEntitlement("user-1");

    expect(db.revenueCatEntitlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isActive: false }),
        update: expect.objectContaining({ isActive: false }),
      })
    );
  });
});
