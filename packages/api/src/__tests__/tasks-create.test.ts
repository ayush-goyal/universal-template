import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    project: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    label: { findMany: vi.fn() },
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
  getUserPlan: vi.fn().mockResolvedValue("pro"), // skip free-tier limit checks
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

const inboxRow = {
  id: "p-inbox",
  userId: "u1",
  isInbox: true,
  name: "Inbox",
  color: "sage",
  viewType: "LIST" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tasks.create", () => {
  describe("project resolution", () => {
    it("returns NOT_FOUND when projectId belongs to another user", async () => {
      // Project lookup returns null → cross-user.
      dbMock.project.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.tasks.create({ title: "x", projectId: "p-stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
        expect((err as TRPCError).message).toMatch(/Project/);
      }
      expect(dbMock.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p-stranger", userId: "u1" },
        })
      );
      expect(dbMock.task.create).not.toHaveBeenCalled();
    });

    it("inherits project from parent task when parentTaskId is given", async () => {
      // Parent task lookup (assertTask) returns the parent on a different project.
      dbMock.task.findFirst.mockResolvedValueOnce({
        id: "t-parent",
        userId: "u1",
        projectId: "p-home",
      });
      // last-order lookup returns null
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-child",
        title: "Sub",
        projectId: "p-home",
        parentTaskId: "t-parent",
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const task = await caller.tasks.create({
        title: "Sub",
        parentTaskId: "t-parent",
      });
      expect(task.projectId).toBe("p-home");
      expect(dbMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: "p-home",
            parentTaskId: "t-parent",
          }),
        })
      );
    });

    it("returns NOT_FOUND when parentTaskId belongs to another user", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.tasks.create({ title: "x", parentTaskId: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      // assertTask scoped query.
      expect(dbMock.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
      expect(dbMock.task.create).not.toHaveBeenCalled();
    });
  });

  describe("label validation", () => {
    it("rejects with BAD_REQUEST when a label belongs to another user", async () => {
      // No projectId provided → ensureInbox path.
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      // Two label IDs requested but only one matches the userId scope.
      dbMock.label.findMany.mockResolvedValueOnce([{ id: "l-mine" }]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.tasks.create({
          title: "x",
          labelIds: ["l-mine", "l-stranger"],
        });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
        expect((err as TRPCError).message).toMatch(/label/i);
      }
      // Verify the query was scoped by userId.
      expect(dbMock.label.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["l-mine", "l-stranger"] }, userId: "u1" },
        })
      );
      expect(dbMock.task.create).not.toHaveBeenCalled();
    });

    it("creates a task with a valid label set", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      dbMock.label.findMany.mockResolvedValueOnce([{ id: "l1" }, { id: "l2" }]);
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        title: "Buy milk",
        projectId: inboxRow.id,
        taskLabels: [
          { label: { id: "l1", name: "errand", color: "sage" } },
          { label: { id: "l2", name: "groceries", color: "sky" } },
        ],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const task = await caller.tasks.create({
        title: "Buy milk",
        labelIds: ["l1", "l2"],
      });
      expect(task.id).toBe("t-new");
      expect(dbMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskLabels: { create: [{ labelId: "l1" }, { labelId: "l2" }] },
          }),
        })
      );
    });
  });

  describe("ordering", () => {
    it("starts new tasks at order=1 in an empty bucket", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        title: "First",
        projectId: inboxRow.id,
        order: 1,
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.create({ title: "First" });
      expect(dbMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 1 }),
        })
      );
    });

    it("appends to the end (max order + 1) when other tasks exist", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      // last task has order=42
      dbMock.task.findFirst.mockResolvedValueOnce({ order: 42 });
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        order: 43,
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.create({ title: "Latest" });
      expect(dbMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 43 }),
        })
      );
    });
  });

  describe("default values", () => {
    it("defaults priority=4 and dueHasTime=false when not provided", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        priority: 4,
        dueHasTime: false,
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.create({ title: "x" });
      const args = dbMock.task.create.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;
      expect(args?.data.priority).toBe(4);
      expect(args?.data.dueHasTime).toBe(false);
    });

    it("preserves explicit priority + dueHasTime values", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      dbMock.task.findFirst.mockResolvedValueOnce(null);
      const dueAt = new Date("2026-06-01T17:00:00Z");
      dbMock.task.create.mockResolvedValueOnce({
        id: "t-new",
        priority: 1,
        dueAt,
        dueHasTime: true,
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.create({
        title: "Critical",
        priority: 1,
        dueAt,
        dueHasTime: true,
      });
      const args = dbMock.task.create.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;
      expect(args?.data.priority).toBe(1);
      expect(args?.data.dueAt).toEqual(dueAt);
      expect(args?.data.dueHasTime).toBe(true);
    });
  });
});
