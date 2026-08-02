import type { Entitlement, EntitlementStatus } from "@acme/shared";
import { db } from "@acme/db";
import { entitlementForPlan, FREE_ENTITLEMENT, getPlan } from "@acme/shared";

/**
 * Resolve what a user is entitled to, across every billing provider.
 *
 * A single user can hold a Stripe subscription bought on the web *and* an App Store subscription
 * bought on their phone — people do this by accident all the time. Both are read and the
 * higher-ranked plan wins, so access never depends on which device asked.
 *
 * This is the only function allowed to decide whether someone is Pro. Everything else (tRPC
 * middleware, the billing page, the mobile paywall) consumes its result, so there is exactly one
 * place to change when a plan or a provider is added.
 */
export async function resolveEntitlement(userId: string): Promise<Entitlement> {
  const [stripeEntitlement, mobileEntitlement] = await Promise.all([
    resolveStripeEntitlement(userId),
    resolveMobileEntitlement(userId),
  ]);

  const candidates = [stripeEntitlement, mobileEntitlement].filter(
    (candidate): candidate is Entitlement => candidate !== null
  );

  if (candidates.length === 0) return FREE_ENTITLEMENT;

  return candidates.reduce((best, candidate) =>
    getPlan(candidate.plan).rank > getPlan(best.plan).rank ? candidate : best
  );
}

/** Batch form of {@link resolveEntitlement}. */
export async function resolveEntitlements(userIds: string[]): Promise<Map<string, Entitlement>> {
  const entries = await Promise.all(
    userIds.map(async (userId) => [userId, await resolveEntitlement(userId)] as const)
  );
  return new Map(entries);
}

async function resolveStripeEntitlement(userId: string): Promise<Entitlement | null> {
  // referenceId is not unique — cancelling and resubscribing leaves the old row behind — so take
  // the most recently ending subscription among those that still grant access.
  const subscriptions = await db.subscription.findMany({
    where: {
      referenceId: userId,
      status: { in: ["active", "trialing", "past_due"] },
    },
    orderBy: { periodEnd: "desc" },
  });

  const now = new Date();
  const subscription = subscriptions.find(
    // `periodEnd` in the past with a still-"active" status means a webhook was missed or delayed.
    // Trust the clock over the stale row.
    (candidate) => !candidate.periodEnd || candidate.periodEnd > now
  );

  if (!subscription) return null;

  return entitlementForPlan(subscription.plan, {
    status: normalizeStripeStatus(subscription.status),
    provider: "stripe",
    store: "web",
    currentPeriodEnd: subscription.periodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
  });
}

async function resolveMobileEntitlement(userId: string): Promise<Entitlement | null> {
  const mobile = await db.mobileSubscription.findUnique({ where: { userId } });
  if (!mobile) return null;

  // Sandbox purchases are free. Honouring them in production would hand out Pro to anyone with a
  // test device, so they only count when the server is itself running outside production.
  if (mobile.environment === "SANDBOX" && process.env.NODE_ENV === "production") return null;

  const status = normalizeMobileStatus(mobile.status);
  if (status === "none" || status === "canceled") return null;

  const now = new Date();
  if (mobile.currentPeriodEnd && mobile.currentPeriodEnd <= now) return null;

  return entitlementForPlan(mobile.plan, {
    status,
    provider: "revenuecat",
    store: mobileStore(mobile.store),
    currentPeriodEnd: mobile.currentPeriodEnd,
    cancelAtPeriodEnd: !mobile.willRenew,
  });
}

/**
 * Collapse Stripe's status vocabulary. `incomplete`, `unpaid` and `incomplete_expired` never reach
 * here because the query filters them out, but they map to "no access" for completeness.
 */
function normalizeStripeStatus(status: string | null): EntitlementStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "none";
  }
}

function normalizeMobileStatus(status: string): EntitlementStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "none";
  }
}

function mobileStore(store: string): Entitlement["store"] {
  switch (store.toUpperCase()) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "app_store";
    case "PLAY_STORE":
      return "play_store";
    case "STRIPE":
    case "RC_BILLING":
    case "PADDLE":
      return "web";
    default:
      return "other";
  }
}
