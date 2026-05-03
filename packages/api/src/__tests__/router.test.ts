import { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { appRouter, createCaller } from "../index";

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

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset();
});

const createAuthedCaller = () => {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    session: { id: "session-1" },
    user: { id: "user-1", email: "test@test.com" },
  } as any);
  return createCaller({ headers: new Headers() });
};

const createUnauthCaller = () => {
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
  return createCaller({ headers: new Headers() });
};

describe("oRPC Router", () => {
  it("appRouter is defined and has expected procedures", () => {
    expect(appRouter).toBeDefined();
    expect(appRouter).toHaveProperty("getUserCount");
    expect(appRouter).toHaveProperty("getCurrentUser");
    expect(appRouter).toHaveProperty("createDevice");
  });

  it("createCaller returns a callable router client", () => {
    const caller = createCaller({ headers: new Headers() });
    expect(typeof caller.getUserCount).toBe("function");
    expect(typeof caller.getCurrentUser).toBe("function");
    expect(typeof caller.createDevice).toBe("function");
  });
});

describe("getUserCount", () => {
  it("returns a number", async () => {
    const caller = createUnauthCaller();
    const count = await caller.getUserCount();
    expect(typeof count).toBe("number");
    expect(count).toBe(42);
  });
});

describe("getCurrentUser", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = createUnauthCaller();
    await expect(caller.getCurrentUser()).rejects.toThrow(ORPCError);
  });

  it("returns user when authenticated", async () => {
    const caller = createAuthedCaller();
    const user = await caller.getCurrentUser();
    expect(user).toEqual({ id: "user-1", email: "test@test.com" });
  });
});

describe("createDevice", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const caller = createUnauthCaller();
    await expect(
      caller.createDevice({ fcmToken: "token", platform: "IOS" as any })
    ).rejects.toThrow(ORPCError);
  });

  it("creates a device when authenticated", async () => {
    const caller = createAuthedCaller();
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
