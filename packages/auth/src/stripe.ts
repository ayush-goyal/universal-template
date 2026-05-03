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
  freeTrial?: {
    days: number;
    onTrialStart?: (subscription: unknown) => Promise<void>;
    onTrialEnd?: (args: { subscription: unknown }, ctx: unknown) => Promise<void>;
    onTrialExpired?: (subscription: unknown, ctx: unknown) => Promise<void>;
  };
};

/**
 * Stripe plans configuration.
 *
 * Replace the `priceId` / `annualDiscountPriceId` values with real
 * Stripe Price IDs from your Stripe Dashboard before going to production.
 * You can also use `lookupKey` / `annualDiscountLookupKey` instead.
 *
 * @see https://better-auth.com/docs/plugins/stripe#plan-configuration
 */
export const stripePlans: StripePlan[] = [
  {
    name: "pro",
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "price_pro_monthly",
    annualDiscountPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "price_pro_annual",
    limits: {
      projects: 50,
      storage: 100,
      apiRequests: 100_000,
    },
    freeTrial: {
      days: 14,
    },
  },
];
