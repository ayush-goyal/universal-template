import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    label: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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

const unauthContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  return createTRPCContext({ headers: new Headers() });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("labels router", () => {
  it("rejects unauthenticated callers", async () => {
    const ctx = await unauthContext();
    const caller = createCaller(ctx);
    await expect(caller.labels.list()).rejects.toThrow(TRPCError);
    await expect(caller.labels.create({ name: "errand" })).rejects.toThrow(TRPCError);
  });

  describe("list", () => {
    it("returns this user's labels alphabetically", async () => {
      dbMock.label.findMany.mockResolvedValueOnce([
        { id: "l-a", name: "alpha", color: "sage" },
        { id: "l-b", name: "beta", color: "sky" },
      ]);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.labels.list();
      expect(result).toHaveLength(2);
      expect(dbMock.label.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          orderBy: { name: "asc" },
        })
      );
    });
  });

  describe("create", () => {
    it("scopes by userId and defaults color to sage", async () => {
      dbMock.label.create.mockResolvedValueOnce({
        id: "l-new",
        name: "errand",
        color: "sage",
        userId: "u1",
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.labels.create({ name: "errand" });
      expect(result).toMatchObject({ name: "errand", color: "sage" });
      expect(dbMock.label.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: "u1", name: "errand", color: "sage" },
        })
      );
    });

    it("converts a unique-constraint failure into CONFLICT", async () => {
      // Prisma raises a P2002 in real life; the router only needs SOMETHING to throw.
      dbMock.label.create.mockRejectedValueOnce(new Error("Unique constraint failed"));
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.labels.create({ name: "errand" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("CONFLICT");
        expect((err as TRPCError).message).toMatch(/already exists/);
      }
    });
  });

  describe("update / delete", () => {
    it("update returns NOT_FOUND when label belongs to a different user", async () => {
      dbMock.label.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.labels.update({ id: "stranger", name: "renamed" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      // Look-up scoped by userId.
      expect(dbMock.label.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "stranger", userId: "u1" },
        })
      );
      expect(dbMock.label.update).not.toHaveBeenCalled();
    });

    it("delete returns NOT_FOUND when label belongs to a different user", async () => {
      dbMock.label.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.labels.delete({ id: "stranger" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("NOT_FOUND");
      }
      expect(dbMock.label.delete).not.toHaveBeenCalled();
    });

    it("update succeeds for the owner and returns the new fields", async () => {
      dbMock.label.findFirst.mockResolvedValueOnce({
        id: "l1",
        userId: "u1",
        name: "errand",
        color: "sage",
      });
      dbMock.label.update.mockResolvedValueOnce({
        id: "l1",
        userId: "u1",
        name: "errands",
        color: "sky",
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.labels.update({ id: "l1", name: "errands", color: "sky" });
      expect(result).toMatchObject({ name: "errands", color: "sky" });
    });
  });
});
