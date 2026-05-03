import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => {
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
        findMany: vi.fn(),
        update: vi.fn(),
      },
      task: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      user: { count: vi.fn(), findUnique: vi.fn() },
      device: { count: vi.fn(), upsert: vi.fn() },
      subscription: { findFirst: vi.fn() },
      taskLabel: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: transaction,
    },
  };
});

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("projects.reorder", () => {
  it("rejects when one of the ids belongs to another user", async () => {
    // Two ids requested but only one matches the userId scope.
    dbMock.project.findMany.mockResolvedValueOnce([{ id: "p1" }]);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.projects.reorder({ orderedIds: ["p1", "stranger"] });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
    // Verify the existence query was scoped by userId.
    expect(dbMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["p1", "stranger"] }, userId: "u1" },
      })
    );
    expect(dbMock.project.update).not.toHaveBeenCalled();
  });

  it("renumbers each project to its 1-based position", async () => {
    dbMock.project.findMany.mockResolvedValueOnce([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    dbMock.project.update.mockResolvedValue({});
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const result = await caller.projects.reorder({ orderedIds: ["p3", "p1", "p2"] });
    expect(result).toEqual({ success: true });
    const updates = dbMock.project.update.mock.calls.map((c) => c[0]);
    expect(updates).toEqual([
      { where: { id: "p3" }, data: { order: 1 } },
      { where: { id: "p1" }, data: { order: 2 } },
      { where: { id: "p2" }, data: { order: 3 } },
    ]);
  });
});

describe("tasks.reorder", () => {
  it("rejects when one task belongs to another user", async () => {
    dbMock.task.findMany.mockResolvedValueOnce([{ id: "t1" }]);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.reorder({ orderedIds: ["t1", "stranger"] });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
    expect(dbMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["t1", "stranger"] }, userId: "u1" },
      })
    );
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("renumbers tasks and applies projectId/sectionId when provided", async () => {
    dbMock.task.findMany.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);
    dbMock.task.update.mockResolvedValue({});
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.reorder({
      orderedIds: ["t2", "t1"],
      projectId: "p-home",
      sectionId: "sec-doing",
    });
    const updates = dbMock.task.update.mock.calls.map((c) => c[0]);
    expect(updates).toEqual([
      {
        where: { id: "t2" },
        data: { order: 1, projectId: "p-home", sectionId: "sec-doing" },
      },
      {
        where: { id: "t1" },
        data: { order: 2, projectId: "p-home", sectionId: "sec-doing" },
      },
    ]);
  });

  it("doesn't include projectId/sectionId in the update when they're not in the input", async () => {
    dbMock.task.findMany.mockResolvedValueOnce([{ id: "t1" }]);
    dbMock.task.update.mockResolvedValue({});
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.reorder({ orderedIds: ["t1"] });
    const update = dbMock.task.update.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(update).toBeDefined();
    expect(update!.data).toEqual({ order: 1 });
  });
});

describe("tasks.move", () => {
  it("rejects when the task isn't owned by the caller", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce(null);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.move({ id: "stranger", projectId: "p-mine" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
    }
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("rejects when the destination project belongs to another user", async () => {
    // Task lookup succeeds (first findFirst).
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    // Project lookup fails (second findFirst returns null).
    dbMock.project.findFirst.mockResolvedValueOnce(null);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.move({ id: "t1", projectId: "p-stranger" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
    }
    // Project ownership query is scoped by userId.
    expect(dbMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-stranger", userId: "u1" },
      })
    );
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("moves a task to a new project + clears section", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-home", userId: "u1" });
    const moved = {
      id: "t1",
      projectId: "p-home",
      sectionId: null,
      parentTaskId: null,
      title: "Buy milk",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    };
    dbMock.task.update.mockResolvedValueOnce(moved);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const result = await caller.tasks.move({
      id: "t1",
      projectId: "p-home",
      sectionId: null,
    });
    expect(result.id).toBe("t1");
    expect(dbMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: { projectId: "p-home", sectionId: null },
      })
    );
  });

  it("nesting under a parentTaskId works without a destination project", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t-child", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({
      id: "t-child",
      parentTaskId: "t-parent",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.move({ id: "t-child", parentTaskId: "t-parent" });
    expect(dbMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { parentTaskId: "t-parent" },
      })
    );
    // Project ownership check was skipped because no projectId was passed.
    expect(dbMock.project.findFirst).not.toHaveBeenCalled();
  });

  it("force-clears sectionId when moving to a different project without specifying one", async () => {
    // Original task lives in project A / section A1.
    dbMock.task.findFirst.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      projectId: "p-a",
      sectionId: "sec-a1",
    });
    dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-b", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({
      id: "t1",
      projectId: "p-b",
      sectionId: null,
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    // Note: caller does NOT pass sectionId.
    await caller.tasks.move({ id: "t1", projectId: "p-b" });
    expect(dbMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "p-b",
          // Old section is force-cleared to prevent referential leak.
          sectionId: null,
        }),
      })
    );
  });

  it("respects an explicit sectionId even when projectId changes", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      projectId: "p-a",
      sectionId: null,
    });
    dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-b", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({
      id: "t1",
      projectId: "p-b",
      sectionId: "sec-b1",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.move({ id: "t1", projectId: "p-b", sectionId: "sec-b1" });
    expect(dbMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "p-b",
          sectionId: "sec-b1",
        }),
      })
    );
  });

  it("does not clear sectionId when projectId is unchanged", async () => {
    // Same project, no section change → should not touch sectionId.
    dbMock.task.findFirst.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      projectId: "p-a",
      sectionId: "sec-a1",
    });
    dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-a", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({
      id: "t1",
      projectId: "p-a",
      sectionId: "sec-a1",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.move({ id: "t1", projectId: "p-a" });
    const update = dbMock.task.update.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(update?.data).not.toHaveProperty("sectionId");
  });
});
