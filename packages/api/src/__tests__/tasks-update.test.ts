import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => {
  const transaction = vi.fn(async (fnOrArr: unknown) => {
    if (typeof fnOrArr === "function") {
      return (fnOrArr as (tx: unknown) => Promise<unknown>)(dbMock);
    }
    return Promise.all(fnOrArr as Promise<unknown>[]);
  });
  const dbMock = {
    project: { findFirst: vi.fn() },
    task: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    taskLabel: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
    subscription: { findFirst: vi.fn() },
    $transaction: transaction,
  };
  return { dbMock };
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

describe("tasks.update", () => {
  it("returns NOT_FOUND when the task isn't owned by the caller", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce(null);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.update({ id: "stranger", title: "renamed" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("NOT_FOUND");
    }
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("rejects unparseable recurrence with BAD_REQUEST", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.update({ id: "t1", recurrence: "every wibble" });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("BAD_REQUEST");
      expect((err as TRPCError).message).toMatch(/recurrence/i);
    }
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("accepts valid recurrence strings", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "t1",
      title: "Workout",
      recurrence: "every monday",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    const result = await caller.tasks.update({
      id: "t1",
      recurrence: "every monday",
    });
    expect(result.recurrence).toBe("every monday");
  });

  it("rejects when the destination project belongs to another user", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    // Destination project lookup returns null → cross-user.
    dbMock.project.findFirst.mockResolvedValueOnce(null);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    try {
      await caller.tasks.update({ id: "t1", projectId: "p-stranger" });
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
    expect(dbMock.task.update).not.toHaveBeenCalled();
  });

  it("replaces label set when labelIds is provided", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.taskLabel.deleteMany.mockResolvedValueOnce({ count: 3 });
    dbMock.taskLabel.createMany.mockResolvedValueOnce({ count: 2 });
    dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "t1",
      taskLabels: [{ label: { id: "l1", name: "x", color: "sage" } }],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.update({ id: "t1", labelIds: ["l1", "l2"] });
    // Old labels cleared.
    expect(dbMock.taskLabel.deleteMany).toHaveBeenCalledWith({
      where: { taskId: "t1" },
    });
    // New labels created.
    expect(dbMock.taskLabel.createMany).toHaveBeenCalledWith({
      data: [
        { taskId: "t1", labelId: "l1" },
        { taskId: "t1", labelId: "l2" },
      ],
      skipDuplicates: true,
    });
  });

  it("clears all labels when an empty array is provided", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.taskLabel.deleteMany.mockResolvedValueOnce({ count: 2 });
    dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "t1",
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.update({ id: "t1", labelIds: [] });
    expect(dbMock.taskLabel.deleteMany).toHaveBeenCalled();
    // No createMany when the new set is empty.
    expect(dbMock.taskLabel.createMany).not.toHaveBeenCalled();
  });

  it("does not touch labels when labelIds is omitted", async () => {
    dbMock.task.findFirst.mockResolvedValueOnce({ id: "t1", userId: "u1" });
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "t1",
      taskLabels: [{ label: { id: "l1", name: "x", color: "sage" } }],
      _count: { comments: 0, children: 0, reminders: 0 },
    });
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.update({ id: "t1", title: "Renamed only" });
    expect(dbMock.taskLabel.deleteMany).not.toHaveBeenCalled();
    expect(dbMock.taskLabel.createMany).not.toHaveBeenCalled();
  });

  describe("FK safety", () => {
    it("force-clears sectionId when changing project without specifying one", async () => {
      // Original task lives in project A / section A1.
      dbMock.task.findFirst.mockResolvedValueOnce({
        id: "t1",
        userId: "u1",
        projectId: "p-a",
        sectionId: "sec-a1",
      });
      // Destination project ownership check passes.
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-b", userId: "u1" });
      dbMock.task.update.mockResolvedValueOnce({});
      dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
        id: "t1",
        projectId: "p-b",
        sectionId: null,
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.update({ id: "t1", projectId: "p-b" });
      const updateCall = dbMock.task.update.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;
      expect(updateCall?.data).toMatchObject({
        projectId: "p-b",
        sectionId: null,
      });
    });

    it("preserves an explicit sectionId across project changes", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce({
        id: "t1",
        userId: "u1",
        projectId: "p-a",
        sectionId: null,
      });
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p-b", userId: "u1" });
      dbMock.task.update.mockResolvedValueOnce({});
      dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
        id: "t1",
        projectId: "p-b",
        sectionId: "sec-b1",
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.update({
        id: "t1",
        projectId: "p-b",
        sectionId: "sec-b1",
      });
      const updateCall = dbMock.task.update.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;
      expect(updateCall?.data).toMatchObject({
        projectId: "p-b",
        sectionId: "sec-b1",
      });
    });

    it("does not touch sectionId when only the title changes", async () => {
      dbMock.task.findFirst.mockResolvedValueOnce({
        id: "t1",
        userId: "u1",
        projectId: "p-a",
        sectionId: "sec-a1",
      });
      dbMock.task.update.mockResolvedValueOnce({});
      dbMock.task.findUniqueOrThrow.mockResolvedValueOnce({
        id: "t1",
        title: "Renamed",
        sectionId: "sec-a1",
        taskLabels: [],
        _count: { comments: 0, children: 0, reminders: 0 },
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.update({ id: "t1", title: "Renamed" });
      const updateCall = dbMock.task.update.mock.calls[0]?.[0] as
        | { data: Record<string, unknown> }
        | undefined;
      expect(updateCall?.data).not.toHaveProperty("sectionId");
    });
  });
});
