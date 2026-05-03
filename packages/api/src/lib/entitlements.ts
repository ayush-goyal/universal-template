/**
 * Re-export the auth package's entitlement helpers from the api lib so
 * routers can import them via a relative path inside `packages/api/src`.
 *
 * The source of truth is `@acme/auth`'s `entitlements.ts`.
 */
export { FREE_LIMITS, PRO_LIMITS, getLimits, getUserPlan, hasUnlimited } from "@acme/auth";
export type { Limits, Plan } from "@acme/auth";
