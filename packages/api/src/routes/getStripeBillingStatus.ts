import type { BillingStatus } from "@acme/shared/billing";
import { db } from "@acme/db";
import { FREE_PLAN, PRO_PLAN } from "@acme/shared/billing";

import { protectedProcedure } from "../trpc";

export default protectedProcedure.query(async ({ ctx }) => {
  const subscriptions = await db.subscription.findMany({
    where: {
      referenceId: ctx.user.id,
      plan: PRO_PLAN,
      status: {
        in: ["active", "past_due", "trialing"],
      },
    },
    select: {
      id: true,
      status: true,
      periodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  const status: BillingStatus = {
    plan: subscriptions.length > 0 ? PRO_PLAN : FREE_PLAN,
    isPro: subscriptions.length > 0,
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      source: "stripe" as const,
      plan: PRO_PLAN,
      status: subscription.status ?? "active",
      givesAccess: true,
      willRenew: !subscription.cancelAtPeriodEnd,
      currentPeriodEndsAt: subscription.periodEnd,
    })),
  };

  return status;
});
