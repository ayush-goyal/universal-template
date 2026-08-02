/**
 * The shape every client receives when it asks "what is this user allowed to do?".
 *
 * A user can reach Pro through Stripe on the web or through the App Store / Play Store via
 * RevenueCat on mobile, and the answer has to be the same everywhere. `@acme/billing` resolves both
 * sources into one of these; the web app, the Expo app and the tRPC middleware all read it.
 */
import type { PlanId, PlanLimits } from "./plans";
import { getPlan, isAtLeast, PLANS } from "./plans";

/** Which system holds the billing relationship. */
export type BillingProvider = "stripe" | "revenuecat";

/**
 * Where the user must go to change or cancel. This is not cosmetic: an App Store subscription can
 * only be cancelled in the App Store, so showing a Stripe billing-portal button to that user is a
 * dead end and, on iOS, an App Review rejection.
 */
export type BillingStore = "web" | "app_store" | "play_store" | "other";

/**
 * Normalised subscription status. Stripe's and RevenueCat's vocabularies both collapse into this.
 * `past_due` still grants access — the payment retry window is deliberately forgiving.
 */
export type EntitlementStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

/** Statuses that grant the paid plan's features. */
export const ACTIVE_STATUSES: readonly EntitlementStatus[] = ["trialing", "active", "past_due"];

export interface Entitlement {
  plan: PlanId;
  /** Convenience for the overwhelmingly common `plan !== "free"` check. */
  isPro: boolean;
  status: EntitlementStatus;
  provider: BillingProvider | null;
  store: BillingStore | null;
  /** When the current paid period ends; also the access cutoff once cancelled. */
  currentPeriodEnd: Date | null;
  /** The subscription is active but will not renew. */
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
}

export const FREE_ENTITLEMENT: Entitlement = {
  plan: "free",
  isPro: false,
  status: "none",
  provider: null,
  store: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  limits: PLANS.free.limits,
};

/** Build an entitlement from a plan id, keeping `isPro` and `limits` consistent with the catalog. */
export function entitlementForPlan(
  planId: string | null | undefined,
  overrides: Partial<Omit<Entitlement, "plan" | "isPro" | "limits">> = {}
): Entitlement {
  const plan = getPlan(planId);
  return {
    ...FREE_ENTITLEMENT,
    ...overrides,
    plan: plan.id,
    isPro: plan.id !== "free",
    limits: plan.limits,
  };
}

export function isEntitledTo(entitlement: Entitlement, required: PlanId): boolean {
  return isAtLeast(entitlement.plan, required);
}

/**
 * True when the user can be sent to a Stripe billing portal. Store purchases are managed by Apple
 * or Google, so the web app must link out to them instead.
 */
export function isManageableOnWeb(entitlement: Entitlement): boolean {
  return entitlement.provider === "stripe";
}
