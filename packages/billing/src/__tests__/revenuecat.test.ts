import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
  user: { findMany: vi.fn() },
  mobileSubscription: { upsert: vi.fn() },
};

vi.mock("@acme/db", () => ({ db }));

const { verifyRevenueCatWebhook } = await import("../revenuecat/verify");
const { stateFromEvent, stateFromSubscriber } = await import("../revenuecat/sync");
const { handleRevenueCatWebhook } = await import("../revenuecat/webhook");

const SIGNING_SECRET = "whsec_revenuecat_test";

function sign(body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signature = createHmac("sha256", SIGNING_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function webhookBody(event: Record<string, unknown> = {}): string {
  return JSON.stringify({
    api_version: "1.0",
    event: {
      id: "evt_1",
      type: "INITIAL_PURCHASE",
      app_user_id: "user-1",
      entitlement_ids: ["pro"],
      product_id: "pro_monthly",
      store: "APP_STORE",
      environment: "PRODUCTION",
      period_type: "NORMAL",
      expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      event_timestamp_ms: Date.now(),
      ...event,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET = SIGNING_SECRET;
  delete process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;
  delete process.env.REVENUECAT_SECRET_API_KEY;
  db.webhookEvent.findUnique.mockResolvedValue(null);
  db.webhookEvent.create.mockResolvedValue({});
  db.user.findMany.mockResolvedValue([{ id: "user-1" }]);
  db.mobileSubscription.upsert.mockResolvedValue({});
});

describe("verifyRevenueCatWebhook", () => {
  it("accepts a correctly signed body", () => {
    const body = webhookBody();

    expect(
      verifyRevenueCatWebhook({
        rawBody: body,
        signatureHeader: sign(body),
        authorizationHeader: null,
      })
    ).toEqual({ ok: true });
  });

  it("rejects a body that was modified after signing", () => {
    const signature = sign(webhookBody());

    const result = verifyRevenueCatWebhook({
      rawBody: webhookBody({ entitlement_ids: ["pro", "enterprise"] }),
      signatureHeader: signature,
      authorizationHeader: null,
    });

    expect(result).toEqual({ ok: false, reason: "Signature did not match." });
  });

  it("rejects a replayed delivery outside the tolerance window", () => {
    const body = webhookBody();
    const oldTimestamp = Math.floor(Date.now() / 1000) - 3600;

    const result = verifyRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body, oldTimestamp),
      authorizationHeader: null,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it("fails closed when no secret is configured at all", () => {
    delete process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
    const body = webhookBody();

    expect(
      verifyRevenueCatWebhook({ rawBody: body, signatureHeader: null, authorizationHeader: null })
    ).toMatchObject({ ok: false });
  });

  it("accepts a matching Authorization header when that is the configured mechanism", () => {
    delete process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
    process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = "shared-token";

    expect(
      verifyRevenueCatWebhook({
        rawBody: webhookBody(),
        signatureHeader: null,
        authorizationHeader: "shared-token",
      })
    ).toEqual({ ok: true });
  });

  it("rejects a wrong Authorization header", () => {
    delete process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET;
    process.env.REVENUECAT_WEBHOOK_AUTH_HEADER = "shared-token";

    expect(
      verifyRevenueCatWebhook({
        rawBody: webhookBody(),
        signatureHeader: null,
        authorizationHeader: "guessed-token",
      })
    ).toMatchObject({ ok: false });
  });
});

describe("stateFromEvent", () => {
  it("grants pro from a purchase event", () => {
    const state = stateFromEvent(JSON.parse(webhookBody()).event);

    expect(state).toMatchObject({ plan: "pro", status: "active", store: "APP_STORE" });
  });

  it("marks a trial purchase as trialing", () => {
    const state = stateFromEvent(JSON.parse(webhookBody({ period_type: "TRIAL" })).event);

    expect(state.status).toBe("trialing");
  });

  it("revokes on expiration", () => {
    const state = stateFromEvent(JSON.parse(webhookBody({ type: "EXPIRATION" })).event);

    expect(state.plan).toBe("free");
  });

  it("keeps access on cancellation but stops the renewal", () => {
    const state = stateFromEvent(JSON.parse(webhookBody({ type: "CANCELLATION" })).event);

    expect(state).toMatchObject({ plan: "pro", willRenew: false });
  });

  it("keeps access through a billing issue, since the store is still retrying", () => {
    const state = stateFromEvent(JSON.parse(webhookBody({ type: "BILLING_ISSUE" })).event);

    expect(state.plan).toBe("pro");
  });

  it("ignores an entitlement that is not in the plan catalog", () => {
    const state = stateFromEvent(JSON.parse(webhookBody({ entitlement_ids: ["unknown"] })).event);

    expect(state.plan).toBe("free");
  });
});

describe("stateFromSubscriber", () => {
  it("reads an active entitlement and its store", () => {
    const state = stateFromSubscriber({
      subscriber: {
        entitlements: {
          pro: {
            expires_date: new Date(Date.now() + 86_400_000).toISOString(),
            product_identifier: "pro_monthly",
          },
        },
        subscriptions: {
          pro_monthly: { store: "play_store", period_type: "normal", is_sandbox: false },
        },
      },
    });

    expect(state).toMatchObject({
      plan: "pro",
      status: "active",
      store: "PLAY_STORE",
      willRenew: true,
    });
  });

  it("treats a null expiry as a lifetime entitlement", () => {
    const state = stateFromSubscriber({
      subscriber: {
        entitlements: { pro: { expires_date: null, product_identifier: "pro_lifetime" } },
        subscriptions: {},
      },
    });

    expect(state).toMatchObject({ plan: "pro", currentPeriodEnd: null });
  });

  it("keeps access while inside a grace period and reports it as past_due", () => {
    const state = stateFromSubscriber({
      subscriber: {
        entitlements: {
          pro: {
            expires_date: new Date(Date.now() - 86_400_000).toISOString(),
            grace_period_expires_date: new Date(Date.now() + 86_400_000).toISOString(),
            product_identifier: "pro_monthly",
          },
        },
        subscriptions: { pro_monthly: { store: "app_store" } },
      },
    });

    expect(state).toMatchObject({ plan: "pro", status: "past_due" });
  });

  it("revokes once every entitlement has expired", () => {
    const state = stateFromSubscriber({
      subscriber: {
        entitlements: {
          pro: {
            expires_date: new Date(Date.now() - 86_400_000).toISOString(),
            product_identifier: "pro_monthly",
          },
        },
        subscriptions: { pro_monthly: { store: "app_store" } },
      },
    });

    expect(state.plan).toBe("free");
  });

  it("reports a cancelled-but-unexpired subscription as not renewing", () => {
    const state = stateFromSubscriber({
      subscriber: {
        entitlements: {
          pro: {
            expires_date: new Date(Date.now() + 86_400_000).toISOString(),
            product_identifier: "pro_monthly",
          },
        },
        subscriptions: {
          pro_monthly: { store: "app_store", unsubscribe_detected_at: "2026-01-01T00:00:00Z" },
        },
      },
    });

    expect(state).toMatchObject({ plan: "pro", willRenew: false });
  });
});

describe("handleRevenueCatWebhook", () => {
  it("processes a signed purchase and mirrors it onto the user", async () => {
    const body = webhookBody();

    const result = await handleRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body),
      authorizationHeader: null,
    });

    expect(result).toEqual({
      status: "processed",
      eventType: "INITIAL_PURCHASE",
      userIds: ["user-1"],
    });
    expect(db.mobileSubscription.upsert).toHaveBeenCalledOnce();
    expect(db.webhookEvent.create).toHaveBeenCalledOnce();
  });

  it("refuses an unsigned delivery without touching the database", async () => {
    const result = await handleRevenueCatWebhook({
      rawBody: webhookBody(),
      signatureHeader: null,
      authorizationHeader: null,
    });

    expect(result.status).toBe("unauthorized");
    expect(db.mobileSubscription.upsert).not.toHaveBeenCalled();
  });

  it("skips an event id it has already processed", async () => {
    db.webhookEvent.findUnique.mockResolvedValue({ provider: "revenuecat", eventId: "evt_1" });
    const body = webhookBody();

    const result = await handleRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body),
      authorizationHeader: null,
    });

    expect(result.status).toBe("duplicate");
    expect(db.mobileSubscription.upsert).not.toHaveBeenCalled();
  });

  it("acknowledges a dashboard test event without granting anything", async () => {
    const body = webhookBody({ type: "TEST" });

    const result = await handleRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body),
      authorizationHeader: null,
    });

    expect(result.status).toBe("ignored");
    expect(db.mobileSubscription.upsert).not.toHaveBeenCalled();
  });

  it("acknowledges a purchase made by an anonymous, not-yet-signed-in customer", async () => {
    db.user.findMany.mockResolvedValue([]);
    const body = webhookBody({ app_user_id: "$RCAnonymousID:abc123" });

    const result = await handleRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body),
      authorizationHeader: null,
    });

    expect(result.status).toBe("ignored");
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("resyncs both sides of a transfer so the origin account loses access", async () => {
    db.user.findMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }]);
    const body = webhookBody({
      type: "TRANSFER",
      app_user_id: null,
      transferred_to: ["user-1"],
      transferred_from: ["user-2"],
    });

    const result = await handleRevenueCatWebhook({
      rawBody: body,
      signatureHeader: sign(body),
      authorizationHeader: null,
    });

    expect(result).toMatchObject({ status: "processed", userIds: ["user-1", "user-2"] });
    expect(db.mobileSubscription.upsert).toHaveBeenCalledTimes(2);
  });

  it("rejects a body that is not valid JSON", async () => {
    const result = await handleRevenueCatWebhook({
      rawBody: "not json",
      signatureHeader: sign("not json"),
      authorizationHeader: null,
    });

    expect(result).toMatchObject({ status: "invalid" });
  });
});
