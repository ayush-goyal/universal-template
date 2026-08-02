/**
 * Billing environment access.
 *
 * Every value is optional. A template has to boot with no payment provider configured, so nothing
 * here throws at import time — callers ask `isStripeConfigured()` / `isRevenueCatConfigured()` and
 * degrade gracefully. `assertStripeConfigured()` exists for the paths that genuinely cannot proceed.
 */

export interface StripeEnv {
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  /** Stripe price IDs keyed by plan id, e.g. `{ pro: { monthly, annual } }`. */
  prices: Record<string, { monthly?: string; annual?: string }>;
}

export interface RevenueCatEnv {
  /** Server-side (secret) API key, used to re-read a customer after a webhook. */
  secretApiKey: string | undefined;
  /** Shared secret for `X-RevenueCat-Webhook-Signature` HMAC verification. */
  webhookSigningSecret: string | undefined;
  /** Value RevenueCat sends in the `Authorization` header, if configured in the dashboard. */
  webhookAuthHeader: string | undefined;
}

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function getStripeEnv(): StripeEnv {
  return {
    secretKey: trimmed(process.env.STRIPE_SECRET_KEY),
    webhookSecret: trimmed(process.env.STRIPE_WEBHOOK_SECRET),
    prices: {
      pro: {
        monthly: trimmed(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
        annual: trimmed(process.env.STRIPE_PRO_ANNUAL_PRICE_ID),
      },
    },
  };
}

export function getRevenueCatEnv(): RevenueCatEnv {
  return {
    secretApiKey: trimmed(process.env.REVENUECAT_SECRET_API_KEY),
    webhookSigningSecret: trimmed(process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET),
    webhookAuthHeader: trimmed(process.env.REVENUECAT_WEBHOOK_AUTH_HEADER),
  };
}

/** Stripe checkout can run. Requires a secret key and at least one configured price. */
export function isStripeConfigured(): boolean {
  const env = getStripeEnv();
  return Boolean(
    env.secretKey && Object.values(env.prices).some((price) => price.monthly ?? price.annual)
  );
}

/**
 * The RevenueCat webhook can be trusted. Without a shared secret any caller could grant themselves
 * Pro, so an unconfigured integration must reject rather than accept.
 */
export function isRevenueCatConfigured(): boolean {
  const env = getRevenueCatEnv();
  return Boolean(env.webhookSigningSecret ?? env.webhookAuthHeader);
}

export function assertStripeConfigured(): void {
  if (isStripeConfigured()) return;
  throw new Error(
    "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRO_MONTHLY_PRICE_ID in your .env."
  );
}
