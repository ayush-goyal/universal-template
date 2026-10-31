import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import { appRouter, createCaller, createTRPCContext } from "../index";

const model = vi.hoisted(() => ({ streamText: vi.fn(), cancel: vi.fn() }));
vi.mock("@ai-sdk/openai", () => ({ openai: vi.fn(() => ({})) }));
vi.mock("ai", async () => ({
  validateUIMessages: (await vi.importActual<typeof import("ai")>("ai")).validateUIMessages,
  convertToModelMessages: vi.fn(async (messages) => messages),
  streamText: model.streamText,
  toUIMessageStream: vi.fn(
    () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-delta", delta: "hello" });
        },
        cancel: model.cancel,
      })
  ),
}));

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
    subscription: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    revenueCatEntitlement: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.subscription.findFirst).mockResolvedValue(null);
  model.streamText.mockReturnValue({ stream: {} });
});

vi.mock("@acme/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
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
    expect(appRouter._def.procedures).toHaveProperty("getStripeBillingStatus");
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

describe("getStripeBillingStatus", () => {
  it("throws UNAUTHORIZED when not authenticated", async () => {
    const ctx = await createUnauthContext();
    const caller = createCaller(ctx);
    await expect(caller.getStripeBillingStatus()).rejects.toThrow(TRPCError);
  });

  it("returns Free when no provider grants access", async () => {
    const ctx = await createAuthedContext();
    const caller = createCaller(ctx);
    await expect(caller.getStripeBillingStatus()).resolves.toEqual({
      plan: "free",
      isPro: false,
      subscriptions: [],
    });
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

describe("chat security", () => {
  const input = {
    messages: [
      { id: "message-1", role: "user" as const, parts: [{ type: "text" as const, text: "Hello" }] },
    ],
  };

  async function startChat(authed = true, payload: unknown = input) {
    const caller = createCaller(await (authed ? createAuthedContext() : createUnauthContext()));
    return caller.chat(payload as typeof input);
  }

  it("rejects unauthenticated users", async () => {
    await expect(startChat(false)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("rejects free accounts before calling the model", async () => {
    await expect(startChat()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(model.streamText).not.toHaveBeenCalled();
  });

  function grantPro() {
    vi.mocked(db.subscription.findFirst).mockResolvedValue({ id: "subscription-1" } as never);
  }

  it("rejects malformed SDK messages before calling the model", async () => {
    grantPro();
    const stream = await startChat(true, {
      messages: [{ ...input.messages[0], parts: [{ type: "text", text: 123 }] }],
    });
    await expect(stream.next()).rejects.toThrow();
    expect(model.streamText).not.toHaveBeenCalled();
  });

  it("cancels the provider when the consumer stops", async () => {
    grantPro();
    const stream = await startChat();
    await stream.next();
    await stream.return(undefined);
    expect(model.cancel).toHaveBeenCalled();
  });
});

describe("HTTP error privacy", () => {
  it("redacts unexpected errors", async () => {
    vi.mocked(db.user.count).mockRejectedValueOnce(new Error("private database detail"));
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request("https://example.test/api/trpc/getUserCount"),
      router: appRouter,
      createContext: createUnauthContext,
    });
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).toContain("Internal server error");
    expect(body).not.toContain("private database detail");
    expect(body).not.toContain('"stack"');
  });
});
