import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    task: { findFirst: vi.fn() },
    reminder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
    subscription: { findFirst: vi.fn() },
  },
}));

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
  getUserPlan: vi.fn().mockResolvedValue("free"),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reminders router", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.reminders.list()).rejects.toThrow(TRPCError);
    await expect(caller.reminders.create({ taskId: "t1", remindAt: new Date() })).rejects.toThrow(
      TRPCError
    );
    await expect(caller.reminders.delete({ id: "r1" })).rejects.toThrow(TRPCError);
  });

  describe("list", () => {
    it("scopes by userId, orders by remindAt asc", async () => {
      dbMock.reminder.findMany.mockResolvedValueOnce([]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.reminders.list();
      expect(dbMock.reminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "u1" }),
          orderBy: { remindAt: "asc" },
        })
      );
    });

    it("filters by taskId when provided", async () => {
      dbMock.reminder.findMany.mockResolvedValueOnce([]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.reminders.list({ taskId: "t1" });
      expect(dbMock.reminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "u1", taskId: "t1" }),
        })
      );
    });

    it("limits to upcoming (sent: false) when requested", async () => {
      dbMock.reminder.findMany.mockResolvedValueOnce([]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.reminders.list({ upcoming: true });
      expect(dbMock.reminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "u1", sent: false }),
        })
      );
    });

    it("excludes reminders attached to tasks in archived projects", async () => {
      dbMock.reminder.findMany.mockResolvedValueOnce([]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.reminders.list();
      const args = dbMock.reminder.findMany.mock.calls[0]?.[0] as
        | { where: Record<string, unknown> }
        | undefined;
      expect(args?.where.task).toEqual({
        OR: [{ projectId: null }, { project: { isArchived: false } }],
      });
    });
  });

  describe("create", () => {
    it("rejects with NOT_FOUND when the parent task is not the caller's", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.reminders.create({
          taskId: "stranger",
          remindAt: new Date(),
        });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      // Task ownership uses userId scope.
      expect(dbMock.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
      expect(dbMock.reminder.create).not.toHaveBeenCalled();
    });

    it("creates a reminder for a task the caller owns", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1" });
      const remindAt = new Date("2026-06-01T09:00:00Z");
      dbMock.reminder.create.mockResolvedValueOnce({
        id: "r-new",
        taskId: "t1",
        userId: "u1",
        remindAt,
        sent: false,
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.reminders.create({ taskId: "t1", remindAt });
      expect(result.taskId).toBe("t1");
      expect(dbMock.reminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { taskId: "t1", userId: "u1", remindAt },
        })
      );
    });
  });

  describe("delete", () => {
    it("rejects with NOT_FOUND for a stranger's reminder", async () => {
      dbMock.reminder.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.reminders.delete({ id: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      expect(dbMock.reminder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
      expect(dbMock.reminder.delete).not.toHaveBeenCalled();
    });

    it("deletes a reminder owned by the caller", async () => {
      dbMock.reminder.findFirst.mockResolvedValueOnce({
        id: "r1",
        userId: "u1",
        taskId: "t1",
      });
      dbMock.reminder.delete.mockResolvedValueOnce({ id: "r1" });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.reminders.delete({ id: "r1" });
      expect(result).toEqual({ success: true });
      expect(dbMock.reminder.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
    });
  });
});
