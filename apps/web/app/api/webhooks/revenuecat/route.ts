import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { handleRevenueCatWebhook, statusCodeFor } from "@acme/billing";

/**
 * RevenueCat webhook endpoint.
 *
 * Point a RevenueCat webhook integration at `https://your-domain.com/api/webhooks/revenuecat` and
 * enable HMAC signing. Stripe needs no equivalent route: Better Auth's plugin serves its own at
 * `/api/auth/stripe/webhook`.
 *
 * Reads the body as text rather than JSON because the signature covers the exact bytes RevenueCat
 * sent — parsing and re-serialising would invalidate every valid delivery.
 */
export async function POST(request: NextRequest) {
  const result = await handleRevenueCatWebhook({
    rawBody: await request.text(),
    signatureHeader: request.headers.get("x-revenuecat-webhook-signature"),
    authorizationHeader: request.headers.get("authorization"),
  });

  if (result.status === "unauthorized" || result.status === "invalid") {
    console.warn(`[revenuecat] rejected webhook: ${result.reason}`);
  }

  return NextResponse.json(result, { status: statusCodeFor(result) });
}
