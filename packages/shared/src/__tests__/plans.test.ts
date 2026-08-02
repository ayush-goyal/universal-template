import { describe, expect, it } from "vitest";

import {
  annualSavingsPercent,
  entitlementForPlan,
  formatPrice,
  getPlan,
  highestPlan,
  isAtLeast,
  isManageableOnWeb,
  PAID_PLANS,
  planFromRevenueCatEntitlements,
  PLANS,
} from "../index";

describe("getPlan", () => {
  it("returns the requested plan", () => {
    expect(getPlan("pro").id).toBe("pro");
  });

  it("falls back to free for values that are not plan ids", () => {
    // Stripe stores the plan as free text and RevenueCat entitlements are renameable, so an
    // unrecognised value has to fail closed rather than throw.
    expect(getPlan("enterprise").id).toBe("free");
    expect(getPlan(null).id).toBe("free");
    expect(getPlan(undefined).id).toBe("free");
  });
});

describe("isAtLeast", () => {
  it("treats pro as satisfying a pro requirement", () => {
    expect(isAtLeast("pro", "pro")).toBe(true);
  });

  it("treats free as not satisfying a pro requirement", () => {
    expect(isAtLeast("free", "pro")).toBe(false);
  });

  it("treats every plan as satisfying a free requirement", () => {
    expect(isAtLeast("free", "free")).toBe(true);
    expect(isAtLeast("pro", "free")).toBe(true);
  });
});

describe("highestPlan", () => {
  it("picks the highest-ranked plan a user holds", () => {
    expect(highestPlan(["free", "pro"]).id).toBe("pro");
  });

  it("returns free for an empty list", () => {
    expect(highestPlan([]).id).toBe("free");
  });
});

describe("planFromRevenueCatEntitlements", () => {
  it("maps the configured entitlement identifier onto its plan", () => {
    expect(planFromRevenueCatEntitlements(["pro"]).id).toBe("pro");
  });

  it("ignores entitlements no plan claims", () => {
    expect(planFromRevenueCatEntitlements(["legacy_lifetime"]).id).toBe("free");
  });

  it("returns free when nothing is active", () => {
    expect(planFromRevenueCatEntitlements([]).id).toBe("free");
  });
});

describe("catalog invariants", () => {
  it("gives every paid plan a RevenueCat entitlement so mobile can sell it", () => {
    for (const plan of PAID_PLANS) {
      expect(plan.revenueCatEntitlement).toBeTruthy();
    }
  });

  it("ranks every paid plan above free", () => {
    for (const plan of PAID_PLANS) {
      expect(plan.rank).toBeGreaterThan(PLANS.free.rank);
    }
  });
});

describe("pricing helpers", () => {
  it("formats whole amounts without trailing zeros", () => {
    expect(formatPrice(1200, "USD")).toBe("$12");
  });

  it("keeps cents when the amount is not whole", () => {
    expect(formatPrice(1250, "USD")).toBe("$12.50");
  });

  it("computes the annual discount", () => {
    expect(annualSavingsPercent(PLANS.pro)).toBe(16);
  });

  it("reports no discount for a free plan", () => {
    expect(annualSavingsPercent(PLANS.free)).toBe(0);
  });
});

describe("entitlementForPlan", () => {
  it("keeps isPro and limits consistent with the catalog", () => {
    const entitlement = entitlementForPlan("pro", { provider: "stripe", store: "web" });

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.limits).toEqual(PLANS.pro.limits);
  });

  it("only allows web management for Stripe subscriptions", () => {
    expect(isManageableOnWeb(entitlementForPlan("pro", { provider: "stripe" }))).toBe(true);
    expect(isManageableOnWeb(entitlementForPlan("pro", { provider: "revenuecat" }))).toBe(false);
  });
});
