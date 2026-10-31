import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgresql://example.test/database";
const { resolveProBackendAccess } = await import("../../billing/getProBackendAccess");

describe("resolveProBackendAccess", () => {
  it("accepts either independently verified provider", () => {
    expect(
      resolveProBackendAccess({
        hasStripeAccess: true,
        revenueCatEntitlement: null,
      }).sources
    ).toEqual(["stripe"]);

    expect(
      resolveProBackendAccess({
        hasStripeAccess: false,
        revenueCatEntitlement: {
          isActive: true,
          expiresAt: null,
        },
      }).sources
    ).toEqual(["revenuecat"]);
  });

  it("rejects an inactive RevenueCat cache entry", () => {
    expect(
      resolveProBackendAccess({
        hasStripeAccess: false,
        revenueCatEntitlement: {
          isActive: false,
          expiresAt: null,
        },
      }).isPro
    ).toBe(false);
  });

  it("rejects expired access even when the expiration webhook has not arrived", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    for (const expiresAt of [new Date("2026-10-29T12:00:00Z"), now]) {
      expect(
        resolveProBackendAccess(
          {
            hasStripeAccess: false,
            revenueCatEntitlement: { isActive: true, expiresAt },
          },
          now
        ).isPro
      ).toBe(false);
    }
    expect(
      resolveProBackendAccess(
        {
          hasStripeAccess: false,
          revenueCatEntitlement: { isActive: true, expiresAt: new Date("2026-10-31T12:00:00Z") },
        },
        now
      ).isPro
    ).toBe(true);
  });
});
