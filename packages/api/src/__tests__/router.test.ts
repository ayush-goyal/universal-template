import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { appRouter, createCaller, createTRPCContext } from "../index";

vi.mock("@acme/db", () => ({
  db: {
    user: {
      count: vi.fn().mockResolvedValue(42),
      findUnique: vi.fn().mockResolvedValue({ id: "user-1", email: "test@test.com" }),
    },
    device: {
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue({
        userId: "user-1",
        fcmToken: "token-123",
        platform: "IOS",
      }),
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
});
