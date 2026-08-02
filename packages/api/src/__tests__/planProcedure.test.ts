import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { auth } from "@acme/auth";
import { db } from "@acme/db";

import { createCallerFactory, createTRPCContext, createTRPCRouter, proProcedure } from "../trpc";

vi.mock("@acme/db", () => ({
  db: {
    subscription: { findMany: vi.fn().mockResolvedValue([]) },
    mobileSubscription: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@acme/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}));

/** A throwaway router, so the gate is tested rather than whichever procedure happens to use it. */
const router = createTRPCRouter({
  proOnly: proProcedure.query(({ ctx }) => ctx.entitlement.plan),
});

const createCaller = createCallerFactory(router);

const contextFor = async (session: unknown) => {
  vi.mocked(auth.api.getSession).mockResolvedValueOnce(session as never);
  return createTRPCContext({ headers: new Headers() });
};

const signedIn = { session: { id: "session-1" }, user: { id: "user-1" } };

const activeProSubscription = [
  {
    id: "sub_1",
    plan: "pro",
    referenceId: "user-1",
    status: "active",
    periodEnd: new Date(Date.now() + 86_400_000),
    cancelAtPeriodEnd: false,
  },
];

describe("proProcedure", () => {
  it("throws UNAUTHORIZED before it ever looks at the plan", async () => {
    const caller = createCaller(await contextFor(null));

    await expect(caller.proOnly()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.subscription.findMany).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN for a signed-in user on the free plan", async () => {
    const caller = createCaller(await contextFor(signedIn));

    await expect(caller.proOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("Pro"),
    });
  });

  it("runs the handler and narrows ctx.entitlement for a Pro user", async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce(activeProSubscription as never);
    const caller = createCaller(await contextFor(signedIn));

    await expect(caller.proOnly()).resolves.toBe("pro");
  });

  it("still grants access while a payment is being retried", async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
      { ...activeProSubscription[0], status: "past_due" },
    ] as never);
    const caller = createCaller(await contextFor(signedIn));

    await expect(caller.proOnly()).resolves.toBe("pro");
  });

  it("refuses once the paid period has elapsed, even if the row still says active", async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce([
      { ...activeProSubscription[0], periodEnd: new Date(Date.now() - 1000) },
    ] as never);
    const caller = createCaller(await contextFor(signedIn));

    await expect(caller.proOnly()).rejects.toThrow(TRPCError);
  });
});
