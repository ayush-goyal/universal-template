import type { PlanLimits } from "@acme/shared";
import { db } from "@acme/db";
import { getLimitsForPlan, isActiveSubscription, PLAN_NAMES } from "@acme/shared";

import { protectedProcedure } from "../trpc";

const getSubscription = protectedProcedure.query(async ({ ctx }) => {
  const subscriptions = await db.subscription.findMany({
    where: {
      referenceId: ctx.user.id,
    },
    orderBy: {
      periodStart: "desc",
    },
  });

  const active = subscriptions.find((sub) => isActiveSubscription(sub.status));

  const currentPlan = active?.plan ?? PLAN_NAMES.FREE;
  const limits: PlanLimits = getLimitsForPlan(currentPlan);

  return {
    subscriptions,
    activePlan: currentPlan,
    isPro: active?.plan === PLAN_NAMES.PRO,
    limits,
    activeSubscription: active ?? null,
  };
});

export default getSubscription;
