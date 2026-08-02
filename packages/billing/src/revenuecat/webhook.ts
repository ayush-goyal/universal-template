import { db } from "@acme/db";

import type { RevenueCatEvent } from "./types";
import { syncRevenueCatUser } from "./sync";
import { IGNORED_EVENT_TYPES, RevenueCatWebhookBodySchema } from "./types";
import { verifyRevenueCatWebhook } from "./verify";

const PROVIDER = "revenuecat";

export type RevenueCatWebhookResult =
  | { status: "processed"; eventType: string; userIds: string[] }
  | { status: "duplicate"; eventType: string }
  | { status: "ignored"; eventType: string; reason: string }
  | { status: "unauthorized"; reason: string }
  | { status: "invalid"; reason: string };

/** HTTP status a route handler should return for each outcome. */
export function statusCodeFor(result: RevenueCatWebhookResult): number {
  switch (result.status) {
    case "unauthorized":
      return 401;
    case "invalid":
      return 400;
    default:
      // Anything understood — including deliberately ignored events — must be acknowledged, or
      // RevenueCat retries five times and then gives up on a delivery that was never a problem.
      return 200;
  }
}

/**
 * Handle one RevenueCat webhook delivery.
 *
 * Framework-agnostic on purpose: the caller supplies the raw body and headers, so the same logic
 * serves the Next.js route handler and the tests. The raw body must not be re-serialised — the
 * HMAC is computed over the exact bytes RevenueCat sent.
 */
export async function handleRevenueCatWebhook(options: {
  rawBody: string;
  signatureHeader: string | null;
  authorizationHeader: string | null;
}): Promise<RevenueCatWebhookResult> {
  const verification = verifyRevenueCatWebhook(options);
  if (!verification.ok) return { status: "unauthorized", reason: verification.reason };

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(options.rawBody);
  } catch {
    return { status: "invalid", reason: "Body is not valid JSON." };
  }

  const body = RevenueCatWebhookBodySchema.safeParse(parsedBody);
  if (!body.success) {
    return { status: "invalid", reason: "Body does not match the RevenueCat webhook shape." };
  }

  const event = body.data.event;

  // RevenueCat documents at-least-once delivery, so the same event id can arrive more than once.
  const alreadyProcessed = await db.webhookEvent.findUnique({
    where: { provider_eventId: { provider: PROVIDER, eventId: event.id } },
  });
  if (alreadyProcessed) return { status: "duplicate", eventType: event.type };

  if (IGNORED_EVENT_TYPES.has(event.type)) {
    await recordEvent(event);
    return { status: "ignored", eventType: event.type, reason: "Event does not affect access." };
  }

  const targets = await resolveTargets(event);
  if (targets.length === 0) {
    // A purchase made before signing in belongs to an anonymous RevenueCat id we have never seen.
    // Acknowledge it: the client calls `Purchases.logIn` after authenticating, which produces a
    // TRANSFER event carrying an id we do recognise.
    await recordEvent(event);
    return {
      status: "ignored",
      eventType: event.type,
      reason: "No local user matches this RevenueCat app user id.",
    };
  }

  for (const target of targets) {
    await syncRevenueCatUser({ userId: target.userId, appUserId: target.appUserId, event });
  }

  await recordEvent(event);

  return {
    status: "processed",
    eventType: event.type,
    userIds: targets.map((target) => target.userId),
  };
}

async function recordEvent(event: RevenueCatEvent): Promise<void> {
  await db.webhookEvent.create({
    data: { provider: PROVIDER, eventId: event.id, type: event.type },
  });
}

/**
 * Map an event onto the local users it affects.
 *
 * The mobile app calls `Purchases.logIn(user.id)`, so a RevenueCat app user id is normally a Better
 * Auth user id. It is not always: purchases made before sign-in carry an anonymous id, and a
 * TRANSFER moves entitlements between ids and has to resync both sides or the origin account keeps
 * access it no longer owns.
 */
async function resolveTargets(
  event: RevenueCatEvent
): Promise<{ userId: string; appUserId: string }[]> {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_to ?? []),
    ...(event.transferred_from ?? []),
  ].filter((id): id is string => typeof id === "string" && !id.startsWith("$RCAnonymousID:"));

  const uniqueIds = [...new Set(candidates)];
  if (uniqueIds.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });

  return users.map((user) => ({ userId: user.id, appUserId: user.id }));
}
