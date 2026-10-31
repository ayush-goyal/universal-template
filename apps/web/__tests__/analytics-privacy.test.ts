import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsEvent } from "@/lib/analytics-privacy";

describe("analytics privacy", () => {
  it("removes reset tokens from event and nested person URL properties", () => {
    const url = "https://example.test/reset-password?token=secret#access_token=other";
    const event: CaptureResult = {
      uuid: "event-id",
      event: "$pageview",
      properties: { $current_url: url, $set_once: { $initial_current_url: url }, plan: "pro" },
      $set: { $referrer: url },
      $set_once: { $initial_referrer: url },
    };
    const sanitized = sanitizeAnalyticsEvent(event);
    expect(sanitized?.properties.$current_url).toBe("https://example.test/reset-password");
    expect(sanitized?.properties.plan).toBe("pro");
    expect(JSON.stringify(sanitized)).not.toContain("secret");
    expect(JSON.stringify(sanitized)).not.toContain("access_token");
    expect(event.properties.$current_url).toBe(url);
  });

  it("drops malformed URLs and preserves direct visits", () => {
    expect(
      sanitizeAnalyticsEvent({
        uuid: "event-id",
        event: "$pageview",
        properties: { $current_url: "not a URL?token=secret", $referrer: "$direct" },
      })?.properties
    ).toEqual({ $current_url: undefined, $referrer: "$direct" });
    expect(sanitizeAnalyticsEvent(null)).toBeNull();
  });

  it("preserves campaign, click, referral, and fragment attribution", () => {
    const url =
      "https://example.test/pricing?utm_source=google&utm_campaign=launch&gclid=click-1&fbclid=click-2&msclkid=click-3&code=partner#plans";
    const event: CaptureResult = {
      uuid: "event-id",
      event: "$pageview",
      properties: { $current_url: url, $referrer: url, $set_once: { $initial_current_url: url } },
    };
    expect(sanitizeAnalyticsEvent(event)).toEqual(event);
  });

  it("removes credentials while keeping attribution on the same URL", () => {
    const event: CaptureResult = {
      uuid: "event-id",
      event: "$pageview",
      properties: {
        $current_url:
          "https://example.test/reset-password?token=secret&utm_source=email#access_token=other&utm_campaign=recovery",
        $referrer:
          "https://example.test/api/auth/callback/google?code=private&state=private&utm_source=google",
      },
    };
    const sanitized = sanitizeAnalyticsEvent(event);
    expect(sanitized?.properties.$current_url).toBe(
      "https://example.test/reset-password?utm_source=email#utm_campaign=recovery"
    );
    expect(sanitized?.properties.$referrer).toBe(
      "https://example.test/api/auth/callback/google?utm_source=google"
    );
  });
});
