import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { appRouter, createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => {
  const mock = {
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
    subscription: { findFirst: vi.fn() },
    project: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    task: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    taskLabel: { findMany: vi.fn() },
    label: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { dbMock: mock };
});

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
  getUserPlan: vi.fn().mockResolvedValue("pro"),
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
  for (const group of Object.values(dbMock)) {
    if (typeof group === "object") {
      for (const fn of Object.values(group as Record<string, unknown>)) {
        if (typeof fn === "function" && "mockReset" in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
  dbMock.subscription.findFirst.mockResolvedValue(null);
  dbMock.taskLabel.findMany.mockResolvedValue([]);
  dbMock.label.findMany.mockResolvedValue([]);
  dbMock.$transaction.mockImplementation(async (fnOrArr: unknown) => {
    if (typeof fnOrArr === "function") {
      const fn = fnOrArr as (tx: typeof dbMock) => Promise<unknown>;
      return fn(dbMock);
    }
    return Promise.all(fnOrArr as Promise<unknown>[]);
  });
});

describe("tasks router", () => {
  it("appRouter exposes the new namespaces", () => {
    expect(appRouter._def.procedures).toHaveProperty("tasks.list");
    expect(appRouter._def.procedures).toHaveProperty("tasks.create");
    expect(appRouter._def.procedures).toHaveProperty("tasks.complete");
    expect(appRouter._def.procedures).toHaveProperty("projects.list");
    expect(appRouter._def.procedures).toHaveProperty("ai.parseQuickAdd");
  });

  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.tasks.list({})).rejects.toThrow(TRPCError);
    await expect(caller.tasks.create({ title: "hi" })).rejects.toThrow(TRPCError);
  });

  it("creates a task in the inbox by default", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    // Inbox lookup: doesn't exist yet → create it.
    dbMock.project.findFirst.mockResolvedValueOnce(null);
    const inbox = {
      id: "p-inbox",
      userId: "u1",
      name: "Inbox",
      isInbox: true,
      color: "sage",
      viewType: "LIST",
      parentId: null,
      order: 0,
      isFavorite: false,
      isArchived: false,
    };
    dbMock.project.create.mockResolvedValueOnce(inbox);
    dbMock.task.findFirst.mockResolvedValueOnce(null); // last task lookup
    dbMock.task.count.mockResolvedValue(0);
    const expectedTask = {
      id: "t1",
      userId: "u1",
      title: "Buy milk",
      projectId: inbox.id,
      sectionId: null,
      parentTaskId: null,
      priority: 4,
      dueAt: null,
      dueHasTime: false,
      recurrence: null,
      order: 1,
      completedAt: null,
      description: null,
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbMock.task.create.mockResolvedValueOnce(expectedTask);

    const task = await caller.tasks.create({ title: "Buy milk" });

    expect(dbMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isInbox: true }) })
    );
    expect(dbMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Buy milk",
          userId: "u1",
          projectId: inbox.id,
          priority: 4,
        }),
      })
    );
    expect(task).toMatchObject({ id: "t1", title: "Buy milk" });
  });

  it("rejects unparseable recurrence on create", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    // Inbox lookup hits an existing inbox so we get past project setup.
    dbMock.project.findFirst.mockResolvedValueOnce({
      id: "p-inbox",
      isInbox: true,
      userId: "u1",
    });
    dbMock.task.count.mockResolvedValue(0);

    await expect(caller.tasks.create({ title: "Bad", recurrence: "xyz nonsense" })).rejects.toThrow(
      /recurrence/i
    );
  });

  it("complete with no recurrence sets completedAt", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    dbMock.task.findFirst.mockResolvedValueOnce({
      id: "t1",
      userId: "u1",
      recurrence: null,
      dueAt: null,
      dueHasTime: false,
      title: "X",
      projectId: "p1",
      sectionId: null,
      parentTaskId: null,
      priority: 4,
      order: 0,
      completedAt: null,
      description: null,
    });
    const updated = {
      id: "t1",
      completedAt: new Date(),
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    };
    dbMock.task.update.mockResolvedValueOnce(updated);

    const r = await caller.tasks.complete({ id: "t1" });
    expect(dbMock.task.update).toHaveBeenCalled();
    expect(r.completedAt).toBeInstanceOf(Date);
  });

  it("complete on a recurring task creates the next instance", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    const original = {
      id: "t1",
      userId: "u1",
      recurrence: "daily",
      dueAt: new Date("2026-05-10T09:00:00Z"),
      dueHasTime: true,
      title: "Workout",
      description: "Stretch first",
      projectId: "p1",
      sectionId: "s1",
      parentTaskId: null,
      priority: 3,
      order: 5,
      completedAt: null,
    };
    dbMock.task.findFirst.mockResolvedValueOnce(original);
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.taskLabel.findMany.mockResolvedValueOnce([{ labelId: "lbl-health" }]);
    const next = {
      id: "t2",
      title: "Workout",
      dueAt: new Date("2026-05-11T09:00:00Z"),
      taskLabels: [{ label: { id: "lbl-health", name: "health", color: "sage" } }],
      _count: { comments: 0, children: 0, reminders: 0 },
    };
    dbMock.task.create.mockResolvedValueOnce(next);

    const r = await caller.tasks.complete({ id: "t1" });

    // Original task is marked completed and its recurrence is cleared so it
    // doesn't re-fire when complete() is somehow re-invoked.
    expect(dbMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: expect.objectContaining({
          completedAt: expect.any(Date),
          recurrence: null,
        }),
      })
    );

    // The cloned task carries forward every plan-mandated field.
    const createCall = dbMock.task.create.mock.calls[0]?.[0] as
      | { data: Record<string, unknown> }
      | undefined;
    expect(createCall).toBeDefined();
    const data = createCall!.data as Record<string, unknown>;
    expect(data.userId).toBe("u1");
    expect(data.title).toBe("Workout");
    expect(data.description).toBe("Stretch first");
    expect(data.projectId).toBe("p1");
    expect(data.sectionId).toBe("s1");
    expect(data.priority).toBe(3);
    expect(data.dueHasTime).toBe(true);
    // Recurrence is preserved on the new instance (so it keeps repeating).
    expect(data.recurrence).toBe("daily");
    // dueAt = nextOccurrence("daily", 2026-05-10T09:00Z) = 2026-05-11T09:00Z.
    expect((data.dueAt as Date).toISOString()).toBe("2026-05-11T09:00:00.000Z");
    // Labels are forwarded to the new task.
    expect(data.taskLabels).toEqual({ create: [{ labelId: "lbl-health" }] });

    expect(r.id).toBe("t2");
  });

  it("complete on a recurring weekday task lands on Monday after Friday", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    // 2026-05-01 is a Friday at 09:00Z. The next weekday is Monday May 4.
    const fri = new Date("2026-05-01T09:00:00Z");
    dbMock.task.findFirst.mockResolvedValueOnce({
      id: "t-wd",
      userId: "u1",
      recurrence: "weekdays",
      dueAt: fri,
      dueHasTime: true,
      title: "Standup",
      description: null,
      projectId: "p1",
      sectionId: null,
      parentTaskId: null,
      priority: 4,
      order: 1,
      completedAt: null,
    });
    dbMock.task.update.mockResolvedValueOnce({});
    dbMock.taskLabel.findMany.mockResolvedValueOnce([]);
    dbMock.task.create.mockResolvedValueOnce({
      id: "t-wd-next",
      title: "Standup",
      dueAt: new Date("2026-05-04T09:00:00Z"),
      taskLabels: [],
      _count: { comments: 0, children: 0, reminders: 0 },
    });

    await caller.tasks.complete({ id: "t-wd" });

    const data = (dbMock.task.create.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    // Should land on Monday — getUTCDay 1.
    expect((data.dueAt as Date).getUTCDay()).toBe(1);
    expect((data.dueAt as Date).toISOString()).toBe("2026-05-04T09:00:00.000Z");
  });
});
