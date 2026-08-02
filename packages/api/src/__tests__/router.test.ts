import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import { appRouter, createCaller, createTRPCContext } from "../index";

vi.mock("@acme/db", () => ({
  db: {
    user: {
      count: vi.fn().mockResolvedValue(42),
      findUnique: vi.fn().mockResolvedValue({ id: "user-1", email: "test@test.com" }),
    },
    device: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({
        userId: "user-1",
        fcmToken: "token-123",
        platform: "IOS",
      }),
    },
    // Read by `resolveEntitlement`, which every plan-aware procedure reaches through
    // `ctx.getEntitlement()`. Empty results mean "this user is on the free plan".
    subscription: { findMany: vi.fn().mockResolvedValue([]) },
    mobileSubscription: { findUnique: vi.fn().mockResolvedValue(null) },
    usageRecord: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
}));

vi.mock("@acme/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
  cert: vi.fn(),
}));

const createAuthedContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce({
    session: { id: "session-1" },
    user: { id: "user-1", email: "test@test.com" },
  } as any);
  return createTRPCContext({ headers: new Headers() });
};

const createUnauthContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  return createTRPCContext({ headers: new Headers() });
};

describe("tRPC Router", () => {
  it("appRouter is defined and has expected procedures", () => {
    expect(appRouter).toBeDefined();
    expect(appRouter._def.procedures).toHaveProperty("getUserCount");
    expect(appRouter._def.procedures).toHaveProperty("getCurrentUser");
    expect(appRouter._def.procedures).toHaveProperty("createDevice");
  });

  it("createTRPCContext returns context with session fields", async () => {
    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx).toHaveProperty("headers");
    expect(ctx).toHaveProperty("session");
    expect(ctx).toHaveProperty("user");
  });
});

describe("getUserCount", () => {
  it("returns a number", async () => {
    const ctx = await createUnauthContext();
    const caller = createCaller(ctx);
    const count = await caller.getUserCount();
    expect(typeof count).toBe("number");
    expect(count).toBe(42);
  });
});

describe("getCurrentUser", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = await createUnauthContext();
    const caller = createCaller(ctx);
    await expect(caller.getCurrentUser()).rejects.toThrow(TRPCError);
  });

  it("returns user when authenticated", async () => {
    const ctx = await createAuthedContext();
    const caller = createCaller(ctx);
    const user = await caller.getCurrentUser();
    expect(user).toEqual({ id: "user-1", email: "test@test.com" });
  });
});

describe("createDevice", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = await createUnauthContext();
    const caller = createCaller(ctx);
    await expect(
      caller.createDevice({ fcmToken: "token", platform: "IOS" as any })
    ).rejects.toThrow(TRPCError);
  });

  it("creates a device when authenticated", async () => {
    const ctx = await createAuthedContext();
    const caller = createCaller(ctx);
    const device = await caller.createDevice({
      fcmToken: "token-123",
      platform: "IOS" as any,
    });
    expect(device).toEqual({
      userId: "user-1",
      fcmToken: "token-123",
      platform: "IOS",
    });
  });

  it("refuses a second device on the free plan", async () => {
    vi.mocked(db.device.count).mockResolvedValueOnce(1);
    const caller = createCaller(await createAuthedContext());

    await expect(
      caller.createDevice({ fcmToken: "another-token", platform: "IOS" as any })
    ).rejects.toThrow(/Upgrade to Pro/);
  });

  it("allows re-registering a device the user already has", async () => {
    vi.mocked(db.device.count).mockResolvedValueOnce(1);
    vi.mocked(db.device.findUnique).mockResolvedValueOnce({
      userId: "user-1",
      fcmToken: "token-123",
    } as any);
    const caller = createCaller(await createAuthedContext());

    await expect(
      caller.createDevice({ fcmToken: "token-123", platform: "IOS" as any })
    ).resolves.toBeDefined();
  });
});

describe("getEntitlement", () => {
  it("reports the free plan for a signed-out visitor", async () => {
    const caller = createCaller(await createUnauthContext());

    expect(await caller.getEntitlement()).toMatchObject({ plan: "free", isPro: false });
  });

  it("reports pro when an active Stripe subscription exists", async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
      {
        id: "sub_1",
        plan: "pro",
        referenceId: "user-1",
        status: "active",
        periodEnd: new Date(Date.now() + 86_400_000),
        cancelAtPeriodEnd: false,
      },
    ] as any);
    const caller = createCaller(await createAuthedContext());

    expect(await caller.getEntitlement()).toMatchObject({
      plan: "pro",
      isPro: true,
      provider: "stripe",
    });
  });
});

describe("getUsage", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = createCaller(await createUnauthContext());

    await expect(caller.getUsage()).rejects.toThrow(TRPCError);
  });

  it("reports today's remaining free-plan allowance", async () => {
    vi.mocked(db.usageRecord.findUnique).mockResolvedValueOnce({ count: 3 } as any);
    const caller = createCaller(await createAuthedContext());

    expect((await caller.getUsage()).aiMessages).toMatchObject({
      used: 3,
      limit: 10,
      remaining: 7,
    });
  });
});
