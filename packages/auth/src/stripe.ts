/**
 * Re-exported so existing imports from `@acme/auth` keep working. The Stripe client and the plan
 * definitions themselves live in `@acme/billing`, which is where every payment concern belongs.
 */
export { getStripePlans, stripe } from "@acme/billing";
