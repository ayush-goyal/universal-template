import { z } from "zod";

/**
 * RevenueCat webhook payload.
 *
 * Deliberately loose: RevenueCat documents that it adds fields and event types without a version
 * bump, so this validates only what the handler reads and passes everything else through. Unknown
 * `type` values must not fail the request — a rejected delivery is retried five times and then
 * dropped.
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
export const RevenueCatEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  app_user_id: z.string().nullish(),
  original_app_user_id: z.string().nullish(),
  aliases: z.array(z.string()).nullish(),
  entitlement_ids: z.array(z.string()).nullish(),
  product_id: z.string().nullish(),
  store: z.string().nullish(),
  environment: z.string().nullish(),
  period_type: z.string().nullish(),
  expiration_at_ms: z.number().nullish(),
  event_timestamp_ms: z.number().nullish(),
  cancel_reason: z.string().nullish(),
  new_product_id: z.string().nullish(),
  // Present on TRANSFER, which moves entitlements between app user ids. Both sides need resyncing.
  transferred_from: z.array(z.string()).nullish(),
  transferred_to: z.array(z.string()).nullish(),
});

export type RevenueCatEvent = z.infer<typeof RevenueCatEventSchema>;

export const RevenueCatWebhookBodySchema = z.object({
  api_version: z.string().nullish(),
  event: RevenueCatEventSchema,
});

export type RevenueCatWebhookBody = z.infer<typeof RevenueCatWebhookBodySchema>;

/** Subset of `GET /v1/subscribers/{app_user_id}` that the sync path reads. */
export const RevenueCatSubscriberSchema = z.object({
  subscriber: z.object({
    original_app_user_id: z.string().nullish(),
    entitlements: z
      .record(
        z.string(),
        z.object({
          expires_date: z.string().nullish(),
          grace_period_expires_date: z.string().nullish(),
          product_identifier: z.string().nullish(),
          purchase_date: z.string().nullish(),
        })
      )
      .default({}),
    subscriptions: z
      .record(
        z.string(),
        z.object({
          expires_date: z.string().nullish(),
          store: z.string().nullish(),
          unsubscribe_detected_at: z.string().nullish(),
          billing_issues_detected_at: z.string().nullish(),
          period_type: z.string().nullish(),
          is_sandbox: z.boolean().nullish(),
        })
      )
      .default({}),
  }),
});

export type RevenueCatSubscriber = z.infer<typeof RevenueCatSubscriberSchema>;

/**
 * Events that revoke access outright. Everything else either grants access or leaves the current
 * state alone; notably `BILLING_ISSUE` does *not* appear here, because the store is still retrying
 * the charge and cutting the user off mid-retry is the wrong call.
 */
export const REVOKING_EVENT_TYPES = new Set(["EXPIRATION"]);

/** Events that have no bearing on entitlement state and are acknowledged without a write. */
export const IGNORED_EVENT_TYPES = new Set([
  "TEST",
  "PAYWALL_IMPRESSION",
  "PAYWALL_CLOSE",
  "PAYWALL_CANCEL",
  "PAYWALL_EXIT_OFFER",
  "PAYWALL_COMPONENT_INTERACTED",
  "EXPERIMENT_ENROLLMENT",
  "SUBSCRIBER_ALIAS",
  "VIRTUAL_CURRENCY_TRANSACTION",
  "INVOICE_ISSUANCE",
]);
