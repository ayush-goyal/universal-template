import { describe, expect, it } from "vitest";

import { resolveProBackendAccess } from "../../billing/getProBackendAccess";

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
        },
      }).isPro
    ).toBe(false);
  });
});
