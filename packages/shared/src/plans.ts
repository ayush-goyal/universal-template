/**
 * The plan catalog: the single source of truth for what Free and Pro mean.
 *
 * This module is intentionally dependency-free so the web app, the Expo app, the tRPC API and the
 * Better Auth Stripe config can all import the same definitions. Keep it that way: it is bundled
 * into the React Native app, so a Node-only import here breaks the Metro build. Nothing here reads
 * `process.env` either — Stripe price IDs and RevenueCat keys are joined onto these plans
 * server-side in `@acme/billing`.
 *
 * To add a plan: add an entry to `PLANS`, give it a `rank` above the one it supersedes, and set the
 * env vars for its Stripe prices and its RevenueCat entitlement.
 */

export const PLAN_IDS = ["free", "pro"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

/**
 * Quotas enforced server-side. `null` means unlimited.
 *
 * Every key here must be handled in `@acme/billing`'s usage helpers; a limit nobody checks is
 * marketing copy, not a limit.
 */
export interface PlanLimits {
  /** Chat messages the user may send per UTC day. */
  aiMessagesPerDay: number | null;
  /** Push-notification devices the user may register. */
  devices: number;
}

export interface PlanPrice {
  /** Minor units (cents), to keep money out of floating point. */
  monthly: number;
  annual: number;
  currency: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /**
   * Higher wins. A user holding entitlements from several stores at once gets the highest-ranked
   * plan, and `rank` is what `isAtLeast` compares.
   */
  rank: number;
  price: PlanPrice;
  /** Marketing bullets for the pricing page and the mobile paywall. */
  features: string[];
  limits: PlanLimits;
  /**
   * Free trial length in days for Stripe checkout. Leave undefined for no trial. Store purchases
   * get their trial from the App Store / Play Store product, not from here.
   */
  trialDays?: number;
  /**
   * RevenueCat entitlement identifier that grants this plan, as configured in the RevenueCat
   * dashboard. `null` for plans that cannot be bought through a store.
   */
  revenueCatEntitlement: string | null;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Everything you need to try the product out.",
    rank: 0,
    price: { monthly: 0, annual: 0, currency: "USD" },
    features: ["10 AI messages per day", "1 registered device", "Community support"],
    limits: { aiMessagesPerDay: 10, devices: 1 },
    revenueCatEntitlement: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For people who use the product every day.",
    rank: 10,
    price: { monthly: 1200, annual: 12000, currency: "USD" },
    features: ["Unlimited AI messages", "Up to 10 registered devices", "Priority support"],
    limits: { aiMessagesPerDay: null, devices: 10 },
    revenueCatEntitlement: "pro",
  },
};

export const FREE_PLAN_ID = "free" satisfies PlanId;

/** Plans that are actually sold, in display order. */
export const PAID_PLANS: Plan[] = Object.values(PLANS)
  .filter((plan) => plan.rank > PLANS[FREE_PLAN_ID].rank)
  .sort((a, b) => a.rank - b.rank);

/** Every plan in display order, Free first. */
export const ALL_PLANS: Plan[] = Object.values(PLANS).sort((a, b) => a.rank - b.rank);

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/**
 * Look up a plan, falling back to Free for anything unrecognised.
 *
 * Stripe stores the plan name as a free-text string and RevenueCat entitlements are renameable, so
 * an unknown value reaching this function is expected rather than exceptional. Failing closed to
 * Free is the safe direction.
 */
export function getPlan(planId: string | null | undefined): Plan {
  return isPlanId(planId) ? PLANS[planId] : PLANS[FREE_PLAN_ID];
}

/** True when `planId` grants at least everything `required` grants. */
export function isAtLeast(planId: string | null | undefined, required: PlanId): boolean {
  return getPlan(planId).rank >= PLANS[required].rank;
}

/** The highest-ranked of the given plans, or Free when none are recognised. */
export function highestPlan(planIds: (string | null | undefined)[]): Plan {
  return planIds.reduce<Plan>(
    (best, planId) => (getPlan(planId).rank > best.rank ? getPlan(planId) : best),
    PLANS[FREE_PLAN_ID]
  );
}

/** Resolve the plan granted by a set of active RevenueCat entitlement identifiers. */
export function planFromRevenueCatEntitlements(entitlementIds: readonly string[]): Plan {
  const active = new Set(entitlementIds);
  return highestPlan(
    ALL_PLANS.filter(
      (plan) => plan.revenueCatEntitlement && active.has(plan.revenueCatEntitlement)
    ).map((plan) => plan.id)
  );
}

/** Format minor units for display, e.g. `1200` USD becomes `$12`. */
export function formatPrice(minorUnits: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
  }).format(minorUnits / 100);
}

/** Percentage saved by paying annually, rounded down. `0` when there is no discount. */
export function annualSavingsPercent(plan: Plan): number {
  const fullPrice = plan.price.monthly * 12;
  if (fullPrice <= 0 || plan.price.annual <= 0 || plan.price.annual >= fullPrice) return 0;
  return Math.floor(((fullPrice - plan.price.annual) / fullPrice) * 100);
}
