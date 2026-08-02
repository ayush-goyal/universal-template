import Stripe from "stripe";

import type { Plan } from "@acme/shared";
import { PAID_PLANS } from "@acme/shared";

import { getStripeEnv } from "./env";

/**
 * Shared Stripe SDK client.
 *
 * Constructed even without a key so importing this module never throws — a template must boot with
 * billing switched off. Any call made without a real key fails at the API boundary with Stripe's own
 * authentication error, which is a clearer signal than a crash at startup.
 */
export const stripe = new Stripe(getStripeEnv().secretKey ?? "sk_test_unconfigured", {
  // Pinned so a Stripe-side API change cannot alter behaviour without a deliberate bump. The SDK
  // types only accept the version it ships with, so upgrading `stripe` fails typecheck here until
  // the change has been reviewed — which is the point.
  apiVersion: "2026-07-29.dahlia",
  appInfo: { name: "acme-monorepo-template" },
});

/**
 * Plan shape consumed by Better Auth's Stripe plugin.
 *
 * Declared structurally rather than imported from `@better-auth/stripe` so this package stays free
 * of an auth dependency; `packages/auth` passes the array straight through.
 */
export interface StripePlanConfig {
  name: string;
  priceId?: string;
  annualDiscountPriceId?: string;
  limits?: Record<string, number>;
  freeTrial?: { days: number };
}

/**
 * Turn the plan catalog into Better Auth plans, joining each plan to the Stripe price IDs from the
 * environment.
 *
 * Plans with no configured price are omitted: the plugin would otherwise accept an upgrade and fail
 * at checkout creation. `name` is lower-cased because the plugin lower-cases it before storing, and
 * `resolveEntitlement` compares the stored value against catalog plan ids.
 */
export function getStripePlans(): StripePlanConfig[] {
  const { prices } = getStripeEnv();

  return PAID_PLANS.flatMap((plan) => {
    const price = prices[plan.id];
    if (!price?.monthly && !price?.annual) return [];

    return [
      {
        name: plan.id,
        priceId: price.monthly,
        annualDiscountPriceId: price.annual,
        limits: toStripeLimits(plan),
        ...(plan.trialDays ? { freeTrial: { days: plan.trialDays } } : {}),
      },
    ];
  });
}

/**
 * Better Auth stores plan limits as `Record<string, number>`, which cannot express "unlimited".
 * The catalog remains authoritative; this is only what gets echoed back on the subscription record.
 */
function toStripeLimits(plan: Plan): Record<string, number> {
  return Object.fromEntries(
    Object.entries(plan.limits).flatMap(([key, value]) =>
      typeof value === "number" ? [[key, value]] : []
    )
  );
}
