import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";

import { createCaller, createTRPCContext } from "../index";

const {
  dbMock,
  getUserPlanMock,
  upgradeSubscriptionMock,
  createBillingPortalMock,
  cancelSubscriptionMock,
  restoreSubscriptionMock,
} = vi.hoisted(() => ({
  dbMock: {
    subscription: { findFirst: vi.fn() },
    user: { count: vi.fn(), findUnique: vi.fn() },
    device: { count: vi.fn(), upsert: vi.fn() },
  },
  getUserPlanMock: vi.fn<() => Promise<"free" | "pro">>(),
  upgradeSubscriptionMock: vi.fn<(args: unknown) => Promise<unknown>>(),
  createBillingPortalMock: vi.fn<(args: unknown) => Promise<unknown>>(),
  cancelSubscriptionMock: vi.fn<(args: unknown) => Promise<unknown>>(),
  restoreSubscriptionMock: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@acme/db", () => ({
  db: dbMock,
  DevicePlatform: { IOS: "IOS", ANDROID: "ANDROID" },
  ProjectView: { LIST: "LIST", BOARD: "BOARD" },
}));

vi.mock("@acme/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      upgradeSubscription: upgradeSubscriptionMock,
      createBillingPortal: createBillingPortalMock,
      cancelSubscription: cancelSubscriptionMock,
      restoreSubscription: restoreSubscriptionMock,
    },
  },
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

const unauthContext = async () => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
  return createTRPCContext({ headers: new Headers() });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscription router", () => {
  describe("status", () => {
    it("rejects unauthenticated callers", async () => {
      const ctx = await unauthContext();
      const caller = createCaller(ctx);
      await expect(caller.subscription.status()).rejects.toThrow(TRPCError);
    });

    it("returns free + free limits when no subscription row exists", async () => {
      getUserPlanMock.mockResolvedValueOnce("free");
      dbMock.subscription.findFirst.mockResolvedValueOnce(null);
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const status = await caller.subscription.status();
      expect(status).toEqual({
        plan: "free",
        limits: { projects: 5, tasksPerProject: 50, ai: 0, reminders: 0 },
        currentPeriodEnd: null,
        cancelAtPeriodEnd: null,
        status: null,
      });
    });

    it("returns pro + pro limits + period info when subscription exists", async () => {
      getUserPlanMock.mockResolvedValueOnce("pro");
      const periodEnd = new Date("2026-12-01");
      dbMock.subscription.findFirst.mockResolvedValueOnce({
        id: "s1",
        plan: "pro",
        referenceId: "u1",
        status: "active",
        periodEnd,
        cancelAtPeriodEnd: false,
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const status = await caller.subscription.status();
      expect(status).toMatchObject({
        plan: "pro",
        limits: { projects: -1, ai: 1 },
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        status: "active",
      });
    });
  });

  describe("checkout", () => {
    const validInput = {
      annual: true,
      successUrl: "http://localhost:3000/app/settings?billing=success",
      cancelUrl: "http://localhost:3000/pricing",
    };

    it("returns the upgrade URL when Better Auth resolves one", async () => {
      upgradeSubscriptionMock.mockResolvedValueOnce({
        url: "https://stripe.example/checkout",
      });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.subscription.checkout(validInput);
      expect(result).toEqual({ url: "https://stripe.example/checkout" });
      expect(upgradeSubscriptionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            plan: "pro",
            annual: true,
            successUrl: validInput.successUrl,
            cancelUrl: validInput.cancelUrl,
            disableRedirect: true,
          }),
        })
      );
    });

    it("converts a missing url into a friendly BAD_REQUEST", async () => {
      upgradeSubscriptionMock.mockResolvedValueOnce({});
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.subscription.checkout(validInput);
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
        expect((err as TRPCError).message).toMatch(/Stripe/);
      }
    });

    it("converts Stripe failures into BAD_REQUEST", async () => {
      upgradeSubscriptionMock.mockRejectedValueOnce(new Error("Invalid API Key"));
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.subscription.checkout(validInput);
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
        expect((err as TRPCError).message).toMatch(/Invalid API Key/);
      }
    });

    it("rejects invalid URLs at the zod boundary", async () => {
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      await expect(
        caller.subscription.checkout({
          successUrl: "not-a-url",
          cancelUrl: "http://localhost/pricing",
        } as never)
      ).rejects.toThrow();
    });
  });

  describe("portal / cancel / restore", () => {
    it("portal returns the URL from Better Auth", async () => {
      createBillingPortalMock.mockResolvedValueOnce({ url: "https://stripe.example/portal" });
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.subscription.portal({
        returnUrl: "http://localhost/app/billing",
      });
      expect(result.url).toBe("https://stripe.example/portal");
    });

    it("portal converts errors into BAD_REQUEST", async () => {
      createBillingPortalMock.mockRejectedValueOnce(new Error("portal exploded"));
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.subscription.portal({
          returnUrl: "http://localhost/app/billing",
        });
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
      }
    });

    it("cancel passes returnUrl + disableRedirect through and tolerates a missing url", async () => {
      cancelSubscriptionMock.mockResolvedValueOnce({});
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.subscription.cancel({
        returnUrl: "http://localhost/app/billing",
      });
      expect(result.url).toBeNull();
      expect(cancelSubscriptionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { returnUrl: "http://localhost/app/billing", disableRedirect: true },
        })
      );
    });

    it("restore returns success: true on a clean call", async () => {
      restoreSubscriptionMock.mockResolvedValueOnce({});
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      const result = await caller.subscription.restore();
      expect(result).toEqual({ success: true });
      expect(restoreSubscriptionMock).toHaveBeenCalled();
    });

    it("restore converts errors into BAD_REQUEST", async () => {
      restoreSubscriptionMock.mockRejectedValueOnce(new Error("nothing to restore"));
      const ctx = await authedContext();
      const caller = createCaller(ctx);
      try {
        await caller.subscription.restore();
        throw new Error("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).code).toBe("BAD_REQUEST");
        expect((err as TRPCError).message).toMatch(/nothing to restore/);
      }
    });
  });
});
