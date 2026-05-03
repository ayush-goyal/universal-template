import { Settings as LuxonSettings } from "luxon";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    project: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

const inboxRow = {
  id: "p-inbox",
  userId: "u1",
  name: "Inbox",
  isInbox: true,
  color: "sage",
  viewType: "LIST" as const,
  parentId: null,
  order: 0,
  isFavorite: false,
  isArchived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.task.findMany.mockResolvedValue([]);
});

describe("tasks.list filter behavior", () => {
  // Pin "now" to a known date so smart filters are deterministic.
  beforeAll(() => {
    LuxonSettings.now = () => new Date("2026-05-15T12:00:00Z").getTime();
  });
  afterAll(() => {
    LuxonSettings.now = () => Date.now();
  });

  it("default (no filter) excludes completed tasks and scopes by userId", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({});
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ userId: "u1", completedAt: null });
  });

  it("smart=inbox auto-creates the inbox and filters by inbox project", async () => {
    dbMock.project.findFirst.mockResolvedValueOnce(null);
    dbMock.project.create.mockResolvedValueOnce(inboxRow);
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ smart: "inbox" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({
      userId: "u1",
      projectId: inboxRow.id,
      completedAt: null,
    });
  });

  it("smart=today returns overdue + today (lte end-of-day)", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ smart: "today" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect((args.where as { dueAt?: { lte?: Date } }).dueAt?.lte).toBeInstanceOf(Date);
    // No `gte` clause — overdue should be included.
    expect((args.where as { dueAt?: { gte?: Date } }).dueAt).not.toHaveProperty("gte");
    expect(args.where).toMatchObject({ userId: "u1", completedAt: null });
  });

  it("smart=upcoming spans today through 7 days out", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ smart: "upcoming" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    const dueAt = (args.where as { dueAt: { gte: Date; lte: Date } }).dueAt;
    expect(dueAt.gte).toBeInstanceOf(Date);
    expect(dueAt.lte).toBeInstanceOf(Date);
    // 2026-05-15 → 2026-05-22 (7 days). Verify the difference is roughly 7 days.
    const diffDays = (dueAt.lte.getTime() - dueAt.gte.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(7);
    expect(diffDays).toBeLessThan(8);
  });

  it("smart=completed flips the completedAt filter", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ smart: "completed" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({
      userId: "u1",
      completedAt: { not: null },
    });
  });

  it("includeCompleted=true does not filter completedAt out", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ includeCompleted: true });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).not.toHaveProperty("completedAt");
  });

  it("labelId filter routes through the join table", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ labelId: "lbl-money" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({
      taskLabels: { some: { labelId: "lbl-money" } },
    });
  });

  it("search filter applies a case-insensitive OR against title and description", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await caller.tasks.list({ search: "milk" });
    const args = dbMock.task.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({
      OR: [
        { title: { contains: "milk", mode: "insensitive" } },
        { description: { contains: "milk", mode: "insensitive" } },
      ],
    });
  });

  describe("nested mode", () => {
    it("defaults nested=true for projectId filters and inlines children", async () => {
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.list({ projectId: "p1" });
      const args = dbMock.task.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      // parentTaskId scoped to null so we only fetch top-level rows.
      expect(args.where.parentTaskId).toBeNull();
      // Children are inlined via include.
      expect(args.include.children).toBeDefined();
    });

    it("defaults nested=true for smart=inbox and inlines children", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.list({ smart: "inbox" });
      const args = dbMock.task.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      expect(args.where.parentTaskId).toBeNull();
      expect(args.include.children).toBeDefined();
    });

    it("smart=today is flat by default (subtasks appear as standalone rows)", async () => {
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.list({ smart: "today" });
      const args = dbMock.task.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      expect(args.where).not.toHaveProperty("parentTaskId");
      expect(args.include).not.toHaveProperty("children");
    });

    it("explicit nested=false on a project query overrides the default", async () => {
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await caller.tasks.list({ projectId: "p1", nested: false });
      const args = dbMock.task.findMany.mock.calls[0]?.[0] as {
        where: Record<string, unknown>;
        include: Record<string, unknown>;
      };
      expect(args.where).not.toHaveProperty("parentTaskId");
      expect(args.include).not.toHaveProperty("children");
    });
  });
});
