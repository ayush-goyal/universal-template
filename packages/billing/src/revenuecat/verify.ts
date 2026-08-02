import { createHmac, timingSafeEqual } from "node:crypto";

import { getRevenueCatEnv } from "../env";

export type VerificationResult = { ok: true } | { ok: false; reason: string };

/** Rejects replays of a captured delivery. RevenueCat's own examples use five minutes. */
const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verify a RevenueCat webhook delivery.
 *
 * Two independent mechanisms, both configured in the RevenueCat dashboard, and at least one must be
 * present — an endpoint that grants Pro to unauthenticated callers is worse than one that is
 * switched off, so an unconfigured integration fails closed.
 *
 * `rawBody` must be the bytes exactly as received. Re-serialising a parsed object changes the
 * bytes and makes valid signatures fail.
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks#security-and-best-practices
 */
export function verifyRevenueCatWebhook(options: {
  rawBody: string;
  signatureHeader: string | null;
  authorizationHeader: string | null;
  now?: Date;
  toleranceSeconds?: number;
}): VerificationResult {
  const { webhookSigningSecret, webhookAuthHeader } = getRevenueCatEnv();

  if (!webhookSigningSecret && !webhookAuthHeader) {
    return {
      ok: false,
      reason:
        "RevenueCat webhooks are not configured. Set REVENUECAT_WEBHOOK_SIGNING_SECRET (preferred) or REVENUECAT_WEBHOOK_AUTH_HEADER.",
    };
  }

  if (webhookAuthHeader) {
    if (!options.authorizationHeader) return { ok: false, reason: "Missing Authorization header." };
    if (!safeEqual(options.authorizationHeader, webhookAuthHeader)) {
      return { ok: false, reason: "Authorization header did not match." };
    }
  }

  if (webhookSigningSecret) {
    return verifySignature({
      rawBody: options.rawBody,
      signatureHeader: options.signatureHeader,
      secret: webhookSigningSecret,
      now: options.now ?? new Date(),
      toleranceSeconds: options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS,
    });
  }

  return { ok: true };
}

function verifySignature(options: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  now: Date;
  toleranceSeconds: number;
}): VerificationResult {
  if (!options.signatureHeader) {
    return { ok: false, reason: "Missing X-RevenueCat-Webhook-Signature header." };
  }

  // Header format: `t=<unix seconds>,v1=<hex hmac sha256>`
  const parts = new Map(
    options.signatureHeader.split(",").map((part) => {
      const index = part.indexOf("=");
      return index === -1
        ? ([part.trim(), ""] as const)
        : ([part.slice(0, index).trim(), part.slice(index + 1).trim()] as const);
    })
  );

  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) {
    return { ok: false, reason: "Malformed signature header." };
  }

  const expected = createHmac("sha256", options.secret)
    .update(`${timestamp}.${options.rawBody}`)
    .digest("hex");

  if (!safeEqual(signature, expected)) {
    return { ok: false, reason: "Signature did not match." };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "Signature timestamp is not a number." };
  }

  const skew = Math.abs(options.now.getTime() / 1000 - timestampSeconds);
  if (skew > options.toleranceSeconds) {
    return { ok: false, reason: "Signature timestamp is outside the tolerance window." };
  }

  return { ok: true };
}

/** Constant-time compare that does not leak length through an early return. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // Still burn a comparison so timing does not distinguish "wrong length" from "wrong value".
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
