import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    task: { findFirst: vi.fn() },
    comment: {
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

describe("comments router", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.comments.list({ taskId: "t1" })).rejects.toThrow(TRPCError);
    await expect(caller.comments.create({ taskId: "t1", content: "hi" })).rejects.toThrow(
      TRPCError
    );
    await expect(caller.comments.delete({ id: "c1" })).rejects.toThrow(TRPCError);
  });

  describe("list", () => {
    it("returns NOT_FOUND when the parent task isn't owned by the user", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.comments.list({ taskId: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      // Task assertion is scoped by userId.
      expect(dbMock.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
    });

    it("returns comments in chronological order with author info", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1" });
      dbMock.comment.findMany.mockResolvedValueOnce([
        {
          id: "c1",
          content: "first",
          createdAt: new Date("2026-05-01T00:00:00Z"),
          user: { id: "u1", name: "Demo", image: null },
        },
      ]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.comments.list({ taskId: "t1" });
      expect(result).toHaveLength(1);
      expect(dbMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taskId: "t1" },
          orderBy: { createdAt: "asc" },
          include: expect.any(Object),
        })
      );
    });
  });

  describe("create", () => {
    it("scopes the new comment to the current user", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1" });
      dbMock.comment.create.mockResolvedValueOnce({
        id: "c-new",
        taskId: "t1",
        userId: "u1",
        content: "Looks good",
        createdAt: new Date(),
        user: { id: "u1", name: "Demo", image: null },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.comments.create({ taskId: "t1", content: "Looks good" });
      expect(result.userId).toBe("u1");
      expect(dbMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { taskId: "t1", userId: "u1", content: "Looks good" },
        })
      );
    });

    it("rejects empty content via zod", async () => {
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await expect(caller.comments.create({ taskId: "t1", content: "" })).rejects.toThrow();
    });

    it("returns NOT_FOUND when the parent task isn't owned by the user", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.comments.create({ taskId: "stranger", content: "hi" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      expect(dbMock.comment.create).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("returns NOT_FOUND for a comment authored by another user", async () => {
      // findFirst with where: { id, userId } returns null for non-owner.
      dbMock.comment.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.comments.delete({ id: "c-stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      expect(dbMock.comment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c-stranger", userId: "u1" },
        })
      );
      expect(dbMock.comment.delete).not.toHaveBeenCalled();
    });

    it("deletes a comment when the caller authored it", async () => {
      dbMock.comment.findFirst.mockResolvedValueOnce({
        id: "c1",
        userId: "u1",
        taskId: "t1",
      });
      dbMock.comment.delete.mockResolvedValueOnce({ id: "c1" });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.comments.delete({ id: "c1" });
      expect(result).toEqual({ success: true });
      expect(dbMock.comment.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });
  });
});
