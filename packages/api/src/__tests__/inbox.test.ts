import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";
import { ensureInbox } from "../lib/inbox";

const { dbMock, getUserPlanMock } = vi.hoisted(() => ({
  dbMock: {
    project: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
    subscription: { findFirst: vi.fn() },
  },
  getUserPlanMock: vi.fn<() => Promise<"free" | "pro">>(),
}));

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
  getUserPlan: getUserPlanMock,
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

const inboxRow = {
  id: "p-inbox",
  userId: "u1",
  name: "Inbox",
  color: "sage",
  viewType: "LIST",
  parentId: null,
  order: 0,
  isFavorite: false,
  isArchived: false,
  isInbox: true,
};

describe("Inbox lifecycle", () => {
  describe("ensureInbox helper", () => {
    it("returns the existing inbox when one exists", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      const result = await ensureInbox("u1");
      expect(result).toEqual(inboxRow);
      expect(dbMock.project.create).not.toHaveBeenCalled();
    });

    it("creates a fresh inbox when one doesn't exist", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(null);
      dbMock.project.create.mockResolvedValueOnce({ ...inboxRow, id: "p-new-inbox" });
      const result = await ensureInbox("u1");
      expect(dbMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u1",
            name: "Inbox",
            isInbox: true,
            order: 0,
          }),
        })
      );
      expect(result.isInbox).toBe(true);
    });
  });

  describe("projects.delete cannot delete the inbox", () => {
    it("throws BAD_REQUEST when the project is the inbox", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.projects.delete({ id: inboxRow.id });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
        expect((err as TRPCError).message).toMatch(/Inbox/);
      }
      expect(dbMock.project.delete).not.toHaveBeenCalled();
    });

    it("does delete a normal user project", async () => {
      const home = { ...inboxRow, id: "p-home", name: "Home", isInbox: false };
      dbMock.project.findFirst.mockResolvedValueOnce(home);
      dbMock.project.delete.mockResolvedValueOnce(home);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.projects.delete({ id: home.id });
      expect(result).toEqual({ success: true });
      expect(dbMock.project.delete).toHaveBeenCalledWith({ where: { id: home.id } });
    });
  });

  describe("projects.update can't rename or archive the inbox", () => {
    it("throws BAD_REQUEST when renaming the inbox", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.projects.update({ id: inboxRow.id, name: "Renamed" });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
      }
      expect(dbMock.project.update).not.toHaveBeenCalled();
    });

    it("throws BAD_REQUEST when archiving the inbox", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.projects.update({ id: inboxRow.id, isArchived: true });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
      }
    });

    it("allows non-name/non-archive updates on the inbox (e.g. color)", async () => {
      dbMock.project.findFirst.mockResolvedValueOnce(inboxRow);
      dbMock.project.update.mockResolvedValueOnce({ ...inboxRow, color: "sky" });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.projects.update({ id: inboxRow.id, color: "sky" });
      expect(result.color).toBe("sky");
    });
  });
});
