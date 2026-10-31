import type { CaptureResult } from "posthog-js";

const credentialParameters = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "sessionid",
  "password",
  "secret",
  "authorization",
  "apikey",
  "otp",
]);

function removeCredentials(parameters: URLSearchParams, authPage: boolean) {
  let changed = false;
  for (const key of [...parameters.keys()]) {
    const name = key.replace(/[-_]/g, "").toLowerCase();
    if (credentialParameters.has(name) || (authPage && (name === "code" || name === "state"))) {
      parameters.delete(key);
      changed = true;
    }
  }
  return changed;
}

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => {
      if (typeof value === "string" && /(?:url|referrer)$/i.test(key)) {
        if (value === "$direct") return [key, value];
        try {
          const url = new URL(value);
          if (url.protocol !== "https:" && url.protocol !== "http:") return [key, undefined];
          const authPage = /\/(?:api\/auth|reset-password|verify-email)(?:\/|$)/.test(url.pathname);
          removeCredentials(url.searchParams, authPage);
          const fragment = new URLSearchParams(url.hash.slice(1));
          if (removeCredentials(fragment, authPage)) url.hash = fragment.toString();
          url.username = "";
          url.password = "";
          return [key, url.toString()];
        } catch {
          return [key, undefined];
        }
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, sanitizeProperties(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}

// PostHog also attaches URLs to automatic events and person properties.
export function sanitizeAnalyticsEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  return {
    ...event,
    properties: sanitizeProperties(event.properties),
    ...(event.$set && { $set: sanitizeProperties(event.$set) }),
    ...(event.$set_once && { $set_once: sanitizeProperties(event.$set_once) }),
  };
}
