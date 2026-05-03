import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@acme/db";
import { PLAN_NAMES } from "@acme/shared";

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
  expiration_reason?: string;
  transaction_id: string;
  original_transaction_id: string;
  event_timestamp_ms: number;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

function resolveUserId(event: RevenueCatEvent): string {
  return event.app_user_id || event.original_app_user_id;
}

function mapEventToStatus(eventType: string): string | null {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      return "active";
    case "CANCELLATION":
      return "canceled";
    case "EXPIRATION":
      return "expired";
    case "BILLING_ISSUE":
      return "past_due";
    case "SUBSCRIPTION_PAUSED":
      return "paused";
    default:
      return null;
  }
}

function resolvePlanFromEntitlements(entitlementIds: string[] | null): string {
  if (!entitlementIds || entitlementIds.length === 0) return PLAN_NAMES.PRO;
  const normalized = entitlementIds.map((e) => e.toLowerCase());
  if (normalized.includes("pro")) return PLAN_NAMES.PRO;
  return PLAN_NAMES.PRO;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
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

  const userId = resolveUserId(event);
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 400 });
  }

  const status = mapEventToStatus(event.type);
  if (!status) {
    return NextResponse.json({ received: true });
  }

  const subscriptionId = `rc_${event.original_transaction_id}`;
  const plan = resolvePlanFromEntitlements(event.entitlement_ids);
  const periodType = event.period_type;

  const data = {
    plan,
    referenceId: userId,
    status,
    provider: "revenuecat",
    periodStart: event.purchased_at_ms ? new Date(event.purchased_at_ms) : null,
    periodEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    cancelAtPeriodEnd: event.type === "CANCELLATION" && event.cancel_reason === "UNSUBSCRIBE",
    trialStart: periodType === "TRIAL" ? new Date(event.purchased_at_ms) : null,
    trialEnd:
      periodType === "TRIAL" && event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
  };

  try {
    await db.subscription.upsert({
      where: { id: subscriptionId },
      create: {
        id: subscriptionId,
        ...data,
      },
      update: data,
    });
  } catch (err) {
    console.error("RevenueCat webhook DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
