import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@acme/db";
import { PLAN_NAMES } from "@acme/shared";

/**
 * RevenueCat webhook handler.
 *
 * RevenueCat handles Apple/Google IAP on mobile. This webhook writes
 * purchase events into the same `subscription` table that Better Auth's
 * Stripe plugin manages for web purchases. Both providers share one
 * table, one schema, and one `getSubscription` tRPC query.
 *
 * Configure in RevenueCat Dashboard → Webhooks:
 *   URL:  https://your-domain.com/api/webhooks/revenuecat
 *   Auth: Bearer <REVENUECAT_WEBHOOK_SECRET>
 */

interface RevenueCatEvent {
  type: string;
  id: string;
  app_user_id: string;
  original_app_user_id: string;
  aliases: string[];
  product_id: string;
  entitlement_ids: string[] | null;
  period_type: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  store: string;
  environment: string;
  cancel_reason?: string;
  transaction_id: string;
  original_transaction_id: string;
  event_timestamp_ms: number;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

function mapEventToStatus(type: string): string | null {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      return "active";
    case "CANCELLATION":
      return "canceled";
    case "EXPIRATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    default:
      return null;
  }
}

function resolvePlan(entitlementIds: string[] | null): string {
  if (!entitlementIds?.length) return PLAN_NAMES.PRO;
  if (entitlementIds.some((e) => e.toLowerCase() === "pro")) return PLAN_NAMES.PRO;
  return PLAN_NAMES.PRO;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: RevenueCatWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event } = payload;

  if (event.type === "TEST") {
    return NextResponse.json({ received: true });
  }

  if (event.environment === "SANDBOX" && process.env.NODE_ENV === "production") {
    return NextResponse.json({ received: true });
  }

  const userId = event.app_user_id || event.original_app_user_id;
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 400 });
  }

  const status = mapEventToStatus(event.type);
  if (!status) {
    return NextResponse.json({ received: true });
  }

  const subscriptionId = `rc_${event.original_transaction_id}`;
  const plan = resolvePlan(event.entitlement_ids);
  const isTrial = event.period_type === "TRIAL";

  try {
    await db.subscription.upsert({
      where: { id: subscriptionId },
      create: {
        id: subscriptionId,
        plan,
        referenceId: userId,
        status,
        ...(event.purchased_at_ms ? { periodStart: new Date(event.purchased_at_ms) } : {}),
        ...(event.expiration_at_ms ? { periodEnd: new Date(event.expiration_at_ms) } : {}),
        cancelAtPeriodEnd: event.type === "CANCELLATION" && event.cancel_reason === "UNSUBSCRIBE",
        ...(isTrial
          ? {
              trialStart: new Date(event.purchased_at_ms),
              ...(event.expiration_at_ms ? { trialEnd: new Date(event.expiration_at_ms) } : {}),
            }
          : {}),
      },
      update: {
        plan,
        status,
        ...(event.purchased_at_ms ? { periodStart: new Date(event.purchased_at_ms) } : {}),
        ...(event.expiration_at_ms ? { periodEnd: new Date(event.expiration_at_ms) } : {}),
        cancelAtPeriodEnd: event.type === "CANCELLATION" && event.cancel_reason === "UNSUBSCRIBE",
        ...(event.type === "CANCELLATION" ? { canceledAt: new Date() } : {}),
        ...(event.type === "EXPIRATION" ? { endedAt: new Date() } : {}),
      },
    });
  } catch (err) {
    console.error("RevenueCat webhook DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
