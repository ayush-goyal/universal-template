import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  subscription: { findMany: vi.fn() },
  mobileSubscription: { findUnique: vi.fn() },
};

vi.mock("@acme/db", () => ({ db }));

const { resolveEntitlement } = await import("../entitlement");

const HOUR = 60 * 60 * 1000;
const future = new Date(Date.now() + 30 * 24 * HOUR);
const past = new Date(Date.now() - HOUR);

function stripeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    plan: "pro",
    referenceId: "user-1",
    status: "active",
    periodEnd: future,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

function mobileRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    plan: "pro",
    status: "active",
    store: "APP_STORE",
    currentPeriodEnd: future,
    willRenew: true,
    environment: "PRODUCTION",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.subscription.findMany.mockResolvedValue([]);
  db.mobileSubscription.findUnique.mockResolvedValue(null);
});

describe("resolveEntitlement", () => {
  it("returns the free plan when the user has no subscriptions", async () => {
    const entitlement = await resolveEntitlement("user-1");

    expect(entitlement.plan).toBe("free");
    expect(entitlement.isPro).toBe(false);
    expect(entitlement.limits.aiMessagesPerDay).toBe(10);
  });

  it("grants pro from an active Stripe subscription", async () => {
    db.subscription.findMany.mockResolvedValue([stripeRow()]);

    const entitlement = await resolveEntitlement("user-1");

    expect(entitlement).toMatchObject({
      plan: "pro",
      isPro: true,
      provider: "stripe",
      store: "web",
      status: "active",
    });
    expect(entitlement.limits.aiMessagesPerDay).toBeNull();
  });

  it("grants pro from a RevenueCat purchase and reports the owning store", async () => {
    db.mobileSubscription.findUnique.mockResolvedValue(mobileRow());

    const entitlement = await resolveEntitlement("user-1");

    expect(entitlement).toMatchObject({
      plan: "pro",
      isPro: true,
      provider: "revenuecat",
      store: "app_store",
    });
  });

  it("ignores a Stripe row whose period already ended, even if still marked active", async () => {
    db.subscription.findMany.mockResolvedValue([stripeRow({ periodEnd: past })]);

    expect((await resolveEntitlement("user-1")).plan).toBe("free");
  });

  it("keeps access during a past_due retry window", async () => {
    db.subscription.findMany.mockResolvedValue([stripeRow({ status: "past_due" })]);

    const entitlement = await resolveEntitlement("user-1");

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.status).toBe("past_due");
  });

  it("keeps access when a subscription is set to cancel at period end", async () => {
    db.subscription.findMany.mockResolvedValue([stripeRow({ cancelAtPeriodEnd: true })]);

    const entitlement = await resolveEntitlement("user-1");

    expect(entitlement.isPro).toBe(true);
    expect(entitlement.cancelAtPeriodEnd).toBe(true);
  });

  it("prefers the paid plan when only one of the two providers grants it", async () => {
    db.subscription.findMany.mockResolvedValue([]);
    db.mobileSubscription.findUnique.mockResolvedValue(mobileRow());

    expect((await resolveEntitlement("user-1")).provider).toBe("revenuecat");
  });

  it("ignores a sandbox purchase in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    db.mobileSubscription.findUnique.mockResolvedValue(mobileRow({ environment: "SANDBOX" }));

    try {
      expect((await resolveEntitlement("user-1")).plan).toBe("free");
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("honours a sandbox purchase outside production so the flow is testable", async () => {
    db.mobileSubscription.findUnique.mockResolvedValue(mobileRow({ environment: "SANDBOX" }));

    expect((await resolveEntitlement("user-1")).plan).toBe("pro");
  });

  it("falls back to free when the stored plan is not in the catalog", async () => {
    db.subscription.findMany.mockResolvedValue([stripeRow({ plan: "enterprise-legacy" })]);

    expect((await resolveEntitlement("user-1")).plan).toBe("free");
  });
});
