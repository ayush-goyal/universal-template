/**
 * `@acme/billing` — everything server-side about who is paying and what that buys them.
 *
 * The plan catalog itself lives in `@acme/shared` so clients can render pricing without pulling in
 * the database. This package joins that catalog to the two payment providers:
 *
 * - **Stripe**, for the web, driven by Better Auth's Stripe plugin (`packages/auth`).
 * - **RevenueCat**, for iOS and Android, mirrored into the database by a webhook.
 *
 * `resolveEntitlement` is the single answer to "is this user Pro?" and reads both.
 */

export * from "./entitlement";
export * from "./env";
export * from "./stripe";
export * from "./usage";
export { fetchRevenueCatSubscriber } from "./revenuecat/client";
export { stateFromEvent, stateFromSubscriber, syncRevenueCatUser } from "./revenuecat/sync";
export type { RevenueCatEvent, RevenueCatSubscriber } from "./revenuecat/types";
export { verifyRevenueCatWebhook } from "./revenuecat/verify";
export type { RevenueCatWebhookResult } from "./revenuecat/webhook";
export { handleRevenueCatWebhook, statusCodeFor } from "./revenuecat/webhook";
