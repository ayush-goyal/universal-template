import type { StripePlan } from "@better-auth/stripe";
import Stripe from "stripe";

import {
  PRO_PLAN,
  STRIPE_PRO_ANNUAL_LOOKUP_KEY,
  STRIPE_PRO_MONTHLY_LOOKUP_KEY,
} from "@acme/shared/billing";

export const stripePlans: StripePlan[] = [
  {
    name: PRO_PLAN,
    lookupKey: STRIPE_PRO_MONTHLY_LOOKUP_KEY,
    annualDiscountLookupKey: STRIPE_PRO_ANNUAL_LOOKUP_KEY,
  },
];

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function getStripePrices() {
  const response = await stripe.prices.list({
    active: true,
    lookup_keys: [STRIPE_PRO_MONTHLY_LOOKUP_KEY, STRIPE_PRO_ANNUAL_LOOKUP_KEY],
  });
  return response.data;
}
