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
      project: { findFirst: vi.fn() },
      section: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: { count: vi.fn(), findUnique: vi.fn() },
      device: { count: vi.fn(), upsert: vi.fn() },
      subscription: { findFirst: vi.fn() },
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

const unauthContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  return createTRPCContext({ headers: new Headers() });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sections router", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.sections.list({ projectId: "p1" })).rejects.toThrow(TRPCError);
    await expect(caller.sections.create({ projectId: "p1", name: "Doing" })).rejects.toThrow(
      TRPCError
    );
  });

  describe("list / create / update / delete project gating", () => {
    it("list returns NOT_FOUND when the project isn't owned by the user", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.sections.list({ projectId: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      // Ownership check uses both id and userId.
      expect(dbMock.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
    });

    it("create assigns the next order value", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1" });
      // last section in the project has order=4 → new section gets 5
      dbMock.section.findFirst.mockResolvedValueOnce({ order: 4 });
      dbMock.section.create.mockResolvedValueOnce({
        id: "sec-new",
        projectId: "p1",
        name: "Doing",
        order: 5,
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.sections.create({ projectId: "p1", name: "Doing" });
      expect(result.order).toBe(5);
      expect(dbMock.section.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { projectId: "p1", name: "Doing", order: 5 },
        })
      );
    });

    it("create starts order=1 in an empty project", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1" });
      dbMock.section.findFirst.mockResolvedValueOnce(null);
      dbMock.section.create.mockResolvedValueOnce({
        id: "sec-new",
        projectId: "p1",
        name: "Backlog",
        order: 1,
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.sections.create({ projectId: "p1", name: "Backlog" });
      expect(result.order).toBe(1);
    });

    it("update succeeds for a section in the user's project", async () => {
      dbMock.section.findFirst.mockResolvedValueOnce({
        id: "sec1",
        projectId: "p1",
        name: "Old",
      });
      dbMock.section.update.mockResolvedValueOnce({
        id: "sec1",
        projectId: "p1",
        name: "New",
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.sections.update({ id: "sec1", name: "New" });
      expect(result.name).toBe("New");
      // Section ownership traverses the project relation.
      expect(dbMock.section.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sec1", project: { userId: "u1" } },
        })
      );
    });

    it("delete returns NOT_FOUND for a stranger's section", async () => {
      dbMock.section.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.sections.delete({ id: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      expect(dbMock.section.delete).not.toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("rejects when one of the ids belongs to a different project", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1" });
      // 3 ids requested but only 2 actually live in the project.
      dbMock.section.findMany.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.sections.reorder({
          projectId: "p1",
          orderedIds: ["s1", "s2", "stranger"],
        });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("FORBIDDEN");
      }
      expect(dbMock.section.update).not.toHaveBeenCalled();
    });

    it("renumbers all sections in the requested order on success", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce({ id: "p1" });
      dbMock.section.findMany.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }, { id: "s3" }]);
      dbMock.section.update.mockResolvedValue({});
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.sections.reorder({
        projectId: "p1",
        orderedIds: ["s3", "s1", "s2"],
      });
      expect(result).toEqual({ success: true });
      // Each section gets a new order matching its position in orderedIds.
      const updates = dbMock.section.update.mock.calls.map((c) => c[0]);
      expect(updates).toEqual([
        { where: { id: "s3" }, data: { order: 1 } },
        { where: { id: "s1" }, data: { order: 2 } },
        { where: { id: "s2" }, data: { order: 3 } },
      ]);
    });
  });
});
