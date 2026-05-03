import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => {
  const mock = {
    task: { findMany: vi.fn() },
    project: { findMany: vi.fn() },
    label: { findMany: vi.fn() },
    subscription: { findFirst: vi.fn() },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
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
  for (const group of Object.values(dbMock)) {
    for (const fn of Object.values(group as Record<string, unknown>)) {
      if (typeof fn === "function" && "mockReset" in fn) {
        (fn as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
});

describe("search router", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.search.query({ q: "milk" })).rejects.toThrow(TRPCError);
  });

  it("queries tasks/projects/labels with case-insensitive substring scoped to the user", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);

    dbMock.task.findMany.mockResolvedValueOnce([
      { id: "t1", title: "Buy milk", project: null, taskLabels: [] },
    ]);
    dbMock.project.findMany.mockResolvedValueOnce([{ id: "p1", name: "Milk run" }]);
    dbMock.label.findMany.mockResolvedValueOnce([{ id: "l1", name: "milky" }]);

    const result = await caller.search.query({ q: "milk" });

    // All three calls scope by userId.
    const taskCall = dbMock.task.findMany.mock.calls[0]?.[0] ?? {};
    expect(taskCall).toMatchObject({ where: expect.objectContaining({ userId: "u1" }) });
    expect(JSON.stringify(taskCall)).toContain('"contains":"milk"');
    expect(JSON.stringify(taskCall)).toContain('"mode":"insensitive"');

    const projectCall = dbMock.project.findMany.mock.calls[0]?.[0] ?? {};
    expect(projectCall).toMatchObject({
      where: expect.objectContaining({ userId: "u1", isArchived: false }),
    });

    const labelCall = dbMock.label.findMany.mock.calls[0]?.[0] ?? {};
    expect(labelCall).toMatchObject({ where: expect.objectContaining({ userId: "u1" }) });

    expect(result.tasks).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.labels).toHaveLength(1);
  });

  it("rejects empty queries via zod", async () => {
    const ctx = await authedContext();
    const caller = createCaller(ctx);
    await expect(caller.search.query({ q: "" })).rejects.toThrow();
  });
});
