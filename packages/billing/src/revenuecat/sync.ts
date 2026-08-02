import { db } from "@acme/db";
import { FREE_PLAN_ID, planFromRevenueCatEntitlements } from "@acme/shared";

import type { RevenueCatEvent, RevenueCatSubscriber } from "./types";
import { fetchRevenueCatSubscriber } from "./client";
import { REVOKING_EVENT_TYPES } from "./types";

/** The entitlement state we mirror into `mobile_subscriptions`. */
interface MobileState {
  plan: string;
  status: string;
  store: string;
  productId: string | null;
  entitlementIds: string[];
  currentPeriodEnd: Date | null;
  willRenew: boolean;
  environment: string;
}

const NO_ACCESS: MobileState = {
  plan: FREE_PLAN_ID,
  status: "canceled",
  store: "UNKNOWN",
  productId: null,
  entitlementIds: [],
  currentPeriodEnd: null,
  willRenew: false,
  environment: "PRODUCTION",
};

/**
 * Bring one user's mirrored RevenueCat state up to date and persist it.
 *
 * Prefers re-reading the customer from RevenueCat's API, which is their documented recommendation:
 * every event type carries a different subset of fields, so reconstructing state per event type is
 * a large surface to get wrong. When no server API key is configured the event payload is used
 * instead, which keeps the template working with webhook-only setup.
 */
export async function syncRevenueCatUser(options: {
  userId: string;
  appUserId: string;
  event?: RevenueCatEvent;
}): Promise<MobileState> {
  const subscriber = await fetchRevenueCatSubscriber(options.appUserId).catch((error: unknown) => {
    console.error("[revenuecat] subscriber lookup failed, falling back to event payload", error);
    return null;
  });

  const state = subscriber
    ? stateFromSubscriber(subscriber)
    : options.event
      ? stateFromEvent(options.event)
      : NO_ACCESS;

  await db.mobileSubscription.upsert({
    where: { userId: options.userId },
    create: {
      userId: options.userId,
      ...state,
      lastEventId: options.event?.id ?? null,
      lastEventAt: eventTimestamp(options.event),
    },
    update: {
      ...state,
      lastEventId: options.event?.id ?? null,
      lastEventAt: eventTimestamp(options.event),
    },
  });

  return state;
}

function eventTimestamp(event: RevenueCatEvent | undefined): Date | null {
  return event?.event_timestamp_ms ? new Date(event.event_timestamp_ms) : null;
}

/**
 * Derive state from a full subscriber record.
 *
 * An entitlement counts as active when it has not expired, or when it is inside a grace period —
 * the store is still retrying payment then, and revoking access mid-retry churns paying customers.
 */
export function stateFromSubscriber(
  subscriber: RevenueCatSubscriber,
  now: Date = new Date()
): MobileState {
  const activeEntitlements = Object.entries(subscriber.subscriber.entitlements).filter(
    ([, entitlement]) => isEntitlementActive(entitlement, now)
  );

  if (activeEntitlements.length === 0) return NO_ACCESS;

  const plan = planFromRevenueCatEntitlements(activeEntitlements.map(([id]) => id));
  if (plan.id === FREE_PLAN_ID) return NO_ACCESS;

  // The entitlement that expires last is the one keeping access alive.
  const [, primaryEntitlement] = activeEntitlements.reduce((latest, candidate) =>
    expiryOf(candidate[1], now) > expiryOf(latest[1], now) ? candidate : latest
  );

  const productId = primaryEntitlement.product_identifier ?? null;
  const subscription = productId ? subscriber.subscriber.subscriptions[productId] : undefined;

  const inGracePeriod =
    Boolean(primaryEntitlement.expires_date) &&
    !isFuture(primaryEntitlement.expires_date, now) &&
    isFuture(primaryEntitlement.grace_period_expires_date, now);

  return {
    plan: plan.id,
    status: inGracePeriod
      ? "past_due"
      : subscription?.billing_issues_detected_at
        ? "past_due"
        : subscription?.period_type === "trial"
          ? "trialing"
          : "active",
    store: subscription?.store?.toUpperCase() ?? "UNKNOWN",
    productId,
    entitlementIds: activeEntitlements.map(([id]) => id),
    currentPeriodEnd:
      toDate(primaryEntitlement.grace_period_expires_date) ??
      toDate(primaryEntitlement.expires_date),
    willRenew: !subscription?.unsubscribe_detected_at,
    environment: subscription?.is_sandbox ? "SANDBOX" : "PRODUCTION",
  };
}

/**
 * Derive state from a webhook event alone, for setups without a server API key.
 *
 * Only the two unambiguous directions are handled — an expiration revokes, anything carrying live
 * entitlements grants. Events that say nothing definite leave the mirror untouched by returning the
 * revoking state only when the event is genuinely revoking.
 */
export function stateFromEvent(event: RevenueCatEvent, now: Date = new Date()): MobileState {
  if (REVOKING_EVENT_TYPES.has(event.type)) return NO_ACCESS;

  const entitlementIds = event.entitlement_ids ?? [];
  const plan = planFromRevenueCatEntitlements(entitlementIds);
  if (plan.id === FREE_PLAN_ID) return NO_ACCESS;

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  if (expiresAt && expiresAt <= now) return NO_ACCESS;

  return {
    plan: plan.id,
    status: event.period_type === "TRIAL" ? "trialing" : "active",
    store: event.store?.toUpperCase() ?? "UNKNOWN",
    productId: event.new_product_id ?? event.product_id ?? null,
    entitlementIds,
    currentPeriodEnd: expiresAt,
    // A cancellation leaves access in place until the period ends; it only stops the renewal.
    willRenew: event.type !== "CANCELLATION",
    environment: event.environment?.toUpperCase() === "SANDBOX" ? "SANDBOX" : "PRODUCTION",
  };
}

interface EntitlementDates {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFuture(value: string | null | undefined, now: Date): boolean {
  const date = toDate(value);
  return date !== null && date > now;
}

/**
 * A null `expires_date` is a lifetime entitlement — RevenueCat reports non-consumables that way —
 * so it grants access forever. A null grace period, by contrast, just means there is no grace
 * period.
 */
function isEntitlementActive(entitlement: EntitlementDates, now: Date): boolean {
  if (!entitlement.expires_date) return true;
  return (
    isFuture(entitlement.expires_date, now) || isFuture(entitlement.grace_period_expires_date, now)
  );
}

/** Sort key for "which entitlement keeps access alive longest". Lifetime sorts above everything. */
function expiryOf(entitlement: EntitlementDates, now: Date): number {
  if (!entitlement.expires_date) return Number.POSITIVE_INFINITY;
  const expires = toDate(entitlement.expires_date);
  const grace = toDate(entitlement.grace_period_expires_date);
  return Math.max(expires?.getTime() ?? now.getTime(), grace?.getTime() ?? now.getTime());
}
