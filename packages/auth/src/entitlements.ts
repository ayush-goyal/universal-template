import { db } from "@acme/db";

export interface Limits {
  /** -1 = unlimited */
  projects: number;
  tasksPerProject: number;
  ai: 0 | 1;
  reminders: 0 | 1;
}

export const FREE_LIMITS: Limits = {
  projects: 5,
  tasksPerProject: 50,
  ai: 0,
  reminders: 0,
};

export const PRO_LIMITS: Limits = {
  projects: -1,
  tasksPerProject: -1,
  ai: 1,
  reminders: 1,
};

export type Plan = "free" | "pro";

/**
 * Returns the active plan for the given user.
 *
 * The Better Auth Stripe plugin writes a row to the `Subscription` table
 * whenever a user has an active subscription. We read it directly so the
 * tRPC layer can enforce free-tier limits without going through Stripe.
 */
export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await db.subscription.findFirst({
    where: {
      referenceId: userId,
      plan: "pro",
      status: { in: ["active", "trialing"] },
    },
  });
  return sub ? "pro" : "free";
}

export async function getLimits(userId: string): Promise<Limits> {
  const plan = await getUserPlan(userId);
  return plan === "pro" ? PRO_LIMITS : FREE_LIMITS;
}

export function hasUnlimited(limit: number) {
  return limit < 0;
}
