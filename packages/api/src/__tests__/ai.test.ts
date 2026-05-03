import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock, getUserPlanMock } = vi.hoisted(() => ({
  dbMock: {
    task: { findMany: vi.fn() },
    subscription: { findFirst: vi.fn() },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
  },
  getUserPlanMock: vi.fn<() => Promise<"free" | "pro">>(),
}));

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
  getUserPlan: getUserPlanMock,
  FREE_LIMITS: { projects: 5, tasksPerProject: 50, ai: 0, reminders: 0 },
  PRO_LIMITS: { projects: -1, tasksPerProject: -1, ai: 1, reminders: 1 },
  hasUnlimited: (n: number) => n < 0,
  sendReminderEmail: vi.fn(),
  stripe: {},
  stripePlans: [],
  PRO_PLAN_NAME: "pro",
  PRO_MONTHLY_USD: 4,
  PRO_YEARLY_USD: 36,
}));

vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => [{}]),
  initializeApp: vi.fn(),
  applicationDefault: vi.fn(),
  cert: vi.fn(),
}));

const authedContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce({
    session: { id: "s1" },
    user: { id: "u1", email: "u@example.com" },
  } as never);
  return createTRPCContext({ headers: new Headers() });
};

const unauthContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  return createTRPCContext({ headers: new Headers() });
};

const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY;
});

describe("ai router gating", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.ai.parseQuickAdd({ text: "hi" })).rejects.toThrow(TRPCError);
    await expect(caller.ai.planMyDay()).rejects.toThrow(TRPCError);
    await expect(caller.ai.generateProject({ goal: "x" })).rejects.toThrow(TRPCError);
    await expect(caller.ai.dailySummary()).rejects.toThrow(TRPCError);
  });

  it("ai.status reports enabled false when OPENAI_API_KEY is missing", async () => {
    getUserPlanMock.mockResolvedValueOnce("free");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const status = await caller.ai.status();
    expect(status).toEqual({ enabled: false, plan: "free" });
  });

  it("ai.status reports enabled true with key + pro plan", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    getUserPlanMock.mockResolvedValueOnce("pro");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const status = await caller.ai.status();
    expect(status).toEqual({ enabled: true, plan: "pro" });
  });

  it("planMyDay throws PRECONDITION_FAILED when AI is not configured", async () => {
    getUserPlanMock.mockResolvedValueOnce("pro");
    dbMock.task.findMany.mockResolvedValueOnce([
      {
        id: "t1",
        title: "Workout",
        priority: 3,
        dueAt: new Date(),
        project: null,
      },
    ]);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.ai.planMyDay();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("PRECONDITION_FAILED");
    }
  });

  it("planMyDay throws FORBIDDEN for free-plan users", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    getUserPlanMock.mockResolvedValueOnce("free");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.ai.planMyDay();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("generateProject throws FORBIDDEN for free-plan users", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    getUserPlanMock.mockResolvedValueOnce("free");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.ai.generateProject({ goal: "Plan a wedding" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("dailySummary throws FORBIDDEN for free-plan users", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    getUserPlanMock.mockResolvedValueOnce("free");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.ai.dailySummary();
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("parseQuickAdd falls back to regex parser for free users", async () => {
    getUserPlanMock.mockResolvedValueOnce("free");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const result = await caller.ai.parseQuickAdd({
      text: "Buy milk tomorrow 9am !p2 #Errands @home",
    });
    expect(result.source).toBe("regex");
    expect(result.title).toBe("Buy milk");
    expect(result.priority).toBe(2);
    expect(result.projectName).toBe("Errands");
    expect(result.labelNames).toEqual(["home"]);
  });

  it("parseQuickAdd falls back to regex when AI is not configured", async () => {
    // pro plan but no key → still regex fallback (graceful)
    getUserPlanMock.mockResolvedValueOnce("pro");
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const result = await caller.ai.parseQuickAdd({ text: "Pay rent every 1st p1" });
    expect(result.source).toBe("regex");
    expect(result.recurrence).toBe("every 1st");
    expect(result.priority).toBe(1);
  });
});
