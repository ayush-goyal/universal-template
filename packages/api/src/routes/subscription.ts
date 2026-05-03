import { FREE_LIMITS, getUserPlan, PRO_LIMITS } from "@acme/auth";
import { db } from "@acme/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * The Better Auth Stripe plugin exposes `/subscription/upgrade` and
 * `/subscription/billing-portal` REST endpoints that the web client invokes
 * via the auth-client SDK. This tRPC router only exposes the read-side
 * status used by the UI for entitlement gating.
 */
export const subscriptionRouter = createTRPCRouter({
  status: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const plan = await getUserPlan(userId);
    const sub = await db.subscription.findFirst({
      where: { referenceId: userId, plan: "pro" },
    });
    return {
      plan,
      limits: plan === "pro" ? PRO_LIMITS : FREE_LIMITS,
      currentPeriodEnd: sub?.periodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? null,
      status: sub?.status ?? null,
    };
  }),
});
