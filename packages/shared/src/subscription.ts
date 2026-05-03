import type { PlanLimits } from "./plans";
import { FREE_LIMITS, getLimitsForPlan, PLAN_NAMES } from "./plans";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export interface ActiveSubscription {
  id: string;
  plan: string;
  status: SubscriptionStatus;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  trialEnd: Date | null;
  billingInterval: string | null;
}

export function isActiveSubscription(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.includes(status as SubscriptionStatus);
}

export function isProUser(subscriptions: { plan: string; status: string | null }[]): boolean {
  return subscriptions.some(
    (sub) => sub.plan === PLAN_NAMES.PRO && isActiveSubscription(sub.status)
  );
}

export function getCurrentPlanLimits(
  subscriptions: { plan: string; status: string | null }[]
): PlanLimits {
  const activeSub = subscriptions.find((sub) => isActiveSubscription(sub.status));
  if (!activeSub) return FREE_LIMITS;
  return getLimitsForPlan(activeSub.plan);
}
