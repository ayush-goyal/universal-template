import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "dummy_key", {
  apiVersion: "2025-12-15.clover",
});

type StripePlan = {
  priceId?: string;
  lookupKey?: string;
  annualDiscountPriceId?: string;
  annualDiscountLookupKey?: string;
  name: string;
  limits?: Record<string, number>;
  group?: string;
  freeTrial?: { days: number };
};

/**
 * Pro plan pricing for Acme Tasks.
 *
 * Configure two recurring prices in your Stripe dashboard with the lookup
 * keys below (`pro_monthly`, `pro_yearly`) and they will be picked up
 * automatically by the Better Auth Stripe plugin.
 */
export const stripePlans: StripePlan[] = [
  {
    name: "pro",
    lookupKey: "pro_monthly",
    annualDiscountLookupKey: "pro_yearly",
    freeTrial: { days: 7 },
    limits: {
      // -1 = unlimited
      projects: -1,
      tasksPerProject: -1,
      ai: 1,
      reminders: 1,
    },
  },
];

export const PRO_PLAN_NAME = "pro";
export const PRO_MONTHLY_USD = 4;
export const PRO_YEARLY_USD = 36;
