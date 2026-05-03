import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock, getUserPlanMock } = vi.hoisted(() => {
  const transaction = vi.fn(async (fnOrArr: unknown) => {
    if (typeof fnOrArr === "function") {
      return (fnOrArr as (tx: unknown) => Promise<unknown>)({});
    }
    return Promise.all(fnOrArr as Promise<unknown>[]);
  });
  return {
    dbMock: {
      project: {
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      task: {
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      label: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      taskLabel: { findMany: vi.fn().mockResolvedValue([]) },
      subscription: { findFirst: vi.fn() },
      user: { count: vi.fn(), findUnique: vi.fn() },
      device: { count: vi.fn(), upsert: vi.fn() },
      $transaction: transaction,
    },
    getUserPlanMock: vi.fn<() => Promise<"free" | "pro">>(),
  };
});

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("free-tier limits", () => {
  describe("projects.create", () => {
    it("rejects when free plan is at the project cap", async () => {
      getUserPlanMock.mockResolvedValueOnce("free");
      // 5 = FREE_LIMITS.projects
      dbMock.project.count.mockResolvedValueOnce(5);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.projects.create({ name: "Sixth" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("FORBIDDEN");
        expect((err as TRPCError).message).toMatch(/Free plan/);
      }
      expect(dbMock.project.create).not.toHaveBeenCalled();
    });

    it("allows creation when free plan is below the cap", async () => {
      getUserPlanMock.mockResolvedValueOnce("free");
      dbMock.project.count.mockResolvedValueOnce(2);
      // last-order lookup
      dbMock.project.findFirst.mockResolvedValueOnce({ order: 3 });
      const created = {
        id: "p-new",
        userId: "u1",
        name: "Home",
        color: "sky",
        viewType: "LIST",
        parentId: null,
        order: 4,
        isFavorite: false,
        isArchived: false,
        isInbox: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbMock.project.create.mockResolvedValueOnce(created);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const project = await caller.projects.create({ name: "Home", color: "sky" });
      expect(project).toMatchObject({ name: "Home" });
      expect(dbMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u1", name: "Home", color: "sky" }),
        })
      );
    });

    it("ignores the cap for pro-plan users", async () => {
      getUserPlanMock.mockResolvedValueOnce("pro");
      dbMock.project.findFirst.mockResolvedValueOnce({ order: 100 });
      dbMock.project.create.mockResolvedValueOnce({
        id: "p-new",
        name: "Hundredth",
        color: "sage",
        viewType: "LIST",
        parentId: null,
        order: 101,
        isFavorite: false,
        isArchived: false,
        isInbox: false,
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.projects.create({ name: "Hundredth" });
      expect(result.name).toBe("Hundredth");
      // count must NOT have been queried (limit check skipped on pro).
      expect(dbMock.project.count).not.toHaveBeenCalled();
    });
  });

  describe("tasks.create", () => {
    it("rejects when free plan is at the per-project task cap", async () => {
      // First call for project lookup (when projectId provided) succeeds.
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1", userId: "u1" });
      getUserPlanMock.mockResolvedValueOnce("free");
      // 50 = FREE_LIMITS.tasksPerProject
      dbMock.task.count.mockResolvedValueOnce(50);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.tasks.create({ title: "Overflow", projectId: "p1" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("FORBIDDEN");
        expect((err as TRPCError).message).toMatch(/Free plan/);
      }
      expect(dbMock.task.create).not.toHaveBeenCalled();
    });

    it("allows creation when free plan is below the per-project cap", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1", userId: "u1" });
      getUserPlanMock.mockResolvedValueOnce("free");
      dbMock.task.count.mockResolvedValueOnce(10);
      dbMock.task.findFirst.mockResolvedValueOnce({ order: 5 });
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        title: "Buy milk",
        projectId: "p1",
        sectionId: null,
        parentTaskId: null,
        priority: 4,
        dueAt: null,
        dueHasTime: false,
        recurrence: null,
        order: 6,
        completedAt: null,
        userId: "u1",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.tasks.create({ title: "Buy milk", projectId: "p1" });
      expect(result.title).toBe("Buy milk");
    });

    it("ignores the cap for pro-plan users", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1", userId: "u1" });
      getUserPlanMock.mockResolvedValueOnce("pro");
      dbMock.task.findFirst.mockResolvedValueOnce({ order: 9999 });
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        title: "Task #9999",
        projectId: "p1",
        sectionId: null,
        parentTaskId: null,
        priority: 4,
        dueAt: null,
        dueHasTime: false,
        recurrence: null,
        order: 10000,
        completedAt: null,
        userId: "u1",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.create({ title: "Task #9999", projectId: "p1" });
      expect(dbMock.task.count).not.toHaveBeenCalled();
    });
  });
});
