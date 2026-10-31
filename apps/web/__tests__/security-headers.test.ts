import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "@/lib/security-headers";

describe("web security headers", () => {
  it("protects base URLs and plugins without restricting app integrations or browser features", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders(true).map(({ key, value }) => [key, value])
    );
    const csp = headers["Content-Security-Policy"];
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/(?:default|script|connect|style|img|font|frame|worker)-src/);
    expect(csp).not.toContain("unsafe-");
    expect(headers["Permissions-Policy"]).toBeUndefined();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Strict-Transport-Security"]).toBe("max-age=31536000");
  });

  it("does not enable HSTS in development", () => {
    expect(
      getSecurityHeaders(false).find(({ key }) => key === "Strict-Transport-Security")
    ).toBeUndefined();
  });

  it("allows PostHog heatmaps without a conflicting frame denial", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders(true).map(({ key, value }) => [key, value])
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'self' https://*.posthog.com"
    );
    expect(headers["X-Frame-Options"]).toBeUndefined();
  });

  it("keeps Cloudflare static asset headers consistent with the production policy", () => {
    const lines = readFileSync(new URL("../public/_headers", import.meta.url), "utf8").split("\n");
    const staticHeaders = Object.fromEntries(
      lines
        .filter((line) => line.startsWith("  "))
        .map((line) => {
          const separator = line.indexOf(":");
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
        })
    );
    expect(staticHeaders).toEqual(
      Object.fromEntries(getSecurityHeaders(true).map(({ key, value }) => [key, value]))
    );
  });
});
