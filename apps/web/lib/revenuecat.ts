import "server-only";

import { z } from "zod";

import { db } from "@acme/db";
import { PRO_ENTITLEMENT } from "@acme/shared/billing";

import { env } from "@/env";

const RevenueCatSubscriptionListSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().nullable(),
      current_period_ends_at: z.number().nullable(),
      gives_access: z.boolean(),
      store: z.string(),
      entitlements: z.object({
        items: z.array(
          z.object({
            lookup_key: z.string(),
          })
        ),
      }),
    })
  ),
});

export async function refreshRevenueCatProEntitlement(userId: string) {
  if (!env.REVENUECAT_PROJECT_ID || !env.REVENUECAT_SECRET_API_KEY) {
    throw new Error("RevenueCat server configuration is incomplete");
  }

  const url = new URL(
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(env.REVENUECAT_PROJECT_ID)}/customers/${encodeURIComponent(userId)}/subscriptions`
  );
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.REVENUECAT_SECRET_API_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`RevenueCat webhook refresh failed with status ${response.status}`);
  }

  const { items } = RevenueCatSubscriptionListSchema.parse(await response.json());
  const proSubscriptions = items.filter((subscription) =>
    subscription.entitlements.items.some(
      (entitlement) => entitlement.lookup_key === PRO_ENTITLEMENT
    )
  );
  const activeSubscription = proSubscriptions.find((subscription) => subscription.gives_access);
  const latestSubscription = activeSubscription ?? proSubscriptions[0];

  return db.revenueCatEntitlement.upsert({
    where: {
      userId_entitlementId: {
        userId,
        entitlementId: PRO_ENTITLEMENT,
      },
    },
    create: {
      userId,
      entitlementId: PRO_ENTITLEMENT,
      isActive: Boolean(activeSubscription),
      expiresAt: latestSubscription?.current_period_ends_at
        ? new Date(latestSubscription.current_period_ends_at)
        : null,
      productId: latestSubscription?.product_id ?? null,
      store: latestSubscription?.store ?? null,
      lastSyncedAt: new Date(),
    },
    update: {
      isActive: Boolean(activeSubscription),
      expiresAt: latestSubscription?.current_period_ends_at
        ? new Date(latestSubscription.current_period_ends_at)
        : null,
      productId: latestSubscription?.product_id ?? null,
      store: latestSubscription?.store ?? null,
      lastSyncedAt: new Date(),
    },
  });
}
