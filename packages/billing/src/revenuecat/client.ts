import type { RevenueCatSubscriber } from "./types";
import { getRevenueCatEnv } from "../env";
import { RevenueCatSubscriberSchema } from "./types";

const API_BASE = "https://api.revenuecat.com/v1";

/**
 * Fetch a customer's current state from RevenueCat.
 *
 * RevenueCat recommends re-reading the customer after every webhook rather than reconstructing
 * state from each event type, because different events carry different fields. The v1 subscriber
 * endpoint is used over v2 because it returns entitlements keyed by their identifier ("pro"),
 * whereas v2 returns opaque internal ids that need a second lookup to resolve.
 *
 * Returns `null` when no server key is configured, which lets the webhook fall back to deriving
 * state from the event payload alone.
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks#syncing-subscription-status
 */
export async function fetchRevenueCatSubscriber(
  appUserId: string,
  options: { signal?: AbortSignal } = {}
): Promise<RevenueCatSubscriber | null> {
  const { secretApiKey } = getRevenueCatEnv();
  if (!secretApiKey) return null;

  const response = await fetch(`${API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${secretApiKey}`,
      Accept: "application/json",
    },
    signal: options.signal,
  });

  // An unknown app user id is a normal outcome: RevenueCat creates customers lazily.
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `RevenueCat subscriber lookup failed with ${response.status} ${response.statusText}`
    );
  }

  return RevenueCatSubscriberSchema.parse(await response.json());
}
