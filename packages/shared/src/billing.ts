export const FREE_PLAN = "free";
export const PRO_PLAN = "pro";
export const PRO_ENTITLEMENT = "pro";

export const STRIPE_PRO_MONTHLY_LOOKUP_KEY = "pro_monthly";
export const STRIPE_PRO_ANNUAL_LOOKUP_KEY = "pro_annual";

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type BillingSubscription = {
  id: string;
  source: "stripe";
  plan: typeof PRO_PLAN;
  status: string;
  givesAccess: boolean;
  willRenew: boolean;
  currentPeriodEndsAt: Date | null;
};

export type BillingStatus = {
  plan: typeof FREE_PLAN | typeof PRO_PLAN;
  isPro: boolean;
  subscriptions: BillingSubscription[];
};
