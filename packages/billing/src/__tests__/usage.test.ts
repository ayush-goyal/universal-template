import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  subscription: { findMany: vi.fn() },
  mobileSubscription: { findUnique: vi.fn() },
  usageRecord: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
};

vi.mock("@acme/db", () => ({ db }));

const { consumeUsage, getUsage, UsageLimitExceededError, usagePeriodStart } =
  await import("../usage");

const PRO = {
  plan: "pro" as const,
  isPro: true,
  status: "active" as const,
  provider: "stripe" as const,
  store: "web" as const,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  limits: { aiMessagesPerDay: null, devices: 10 },
};

beforeEach(() => {
  vi.clearAllMocks();
  db.subscription.findMany.mockResolvedValue([]);
  db.mobileSubscription.findUnique.mockResolvedValue(null);
  db.usageRecord.findUnique.mockResolvedValue(null);
});

describe("usagePeriodStart", () => {
  it("buckets by UTC day regardless of the time within it", () => {
    const morning = usagePeriodStart(new Date("2026-03-04T00:00:01Z"));
    const evening = usagePeriodStart(new Date("2026-03-04T23:59:59Z"));

    expect(morning.toISOString()).toBe("2026-03-04T00:00:00.000Z");
    expect(morning.getTime()).toBe(evening.getTime());
  });
});

describe("getUsage", () => {
  it("reports the free plan's daily allowance", async () => {
    const status = await getUsage("user-1", "aiMessagesPerDay");

    expect(status).toMatchObject({ used: 0, limit: 10, remaining: 10 });
    expect(status.resetsAt).toBeInstanceOf(Date);
  });

  it("subtracts what has already been used today", async () => {
    db.usageRecord.findUnique.mockResolvedValue({ count: 7 });

    expect(await getUsage("user-1", "aiMessagesPerDay")).toMatchObject({
      used: 7,
      remaining: 3,
    });
  });

  it("reports no limit for a pro user and skips the counter read", async () => {
    const status = await getUsage("user-1", "aiMessagesPerDay", PRO);

    expect(status).toMatchObject({ limit: null, remaining: null, resetsAt: null });
    expect(db.usageRecord.findUnique).not.toHaveBeenCalled();
  });
});

describe("consumeUsage", () => {
  it("increments the counter and reports what is left", async () => {
    db.usageRecord.upsert.mockResolvedValue({ count: 4 });

    expect(await consumeUsage("user-1", "aiMessagesPerDay")).toMatchObject({
      used: 4,
      limit: 10,
      remaining: 6,
    });
  });

  it("allows the very last unit of the allowance", async () => {
    db.usageRecord.upsert.mockResolvedValue({ count: 10 });

    expect(await consumeUsage("user-1", "aiMessagesPerDay")).toMatchObject({
      used: 10,
      remaining: 0,
    });
  });

  it("throws once the allowance is spent, and refunds the increment", async () => {
    db.usageRecord.upsert.mockResolvedValue({ count: 11 });

    await expect(consumeUsage("user-1", "aiMessagesPerDay")).rejects.toBeInstanceOf(
      UsageLimitExceededError
    );
    expect(db.usageRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: { decrement: 1 } } })
    );
  });

  it("never counts anything for an unlimited plan", async () => {
    await consumeUsage("user-1", "aiMessagesPerDay", PRO);

    expect(db.usageRecord.upsert).not.toHaveBeenCalled();
  });
});
