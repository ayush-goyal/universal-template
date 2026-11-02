import { describe, expect, it } from "vitest";

import { getSafeRedirectPath, withRedirectTo } from "@/lib/redirect";

const origin = "https://acme.test";

describe("getSafeRedirectPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(getSafeRedirectPath("/dashboard/settings/billing?tab=1#top", origin)).toBe(
      "/dashboard/settings/billing?tab=1#top"
    );
  });

  it("reduces same-origin absolute URLs to a path", () => {
    expect(getSafeRedirectPath("https://acme.test/pricing", origin)).toBe("/pricing");
  });

  it("ignores a path on the configured origin", () => {
    expect(getSafeRedirectPath("/pricing", "https://acme.test/app/")).toBe("/pricing");
  });

  it.each([undefined, "", ["/a", "/b"]])("falls back for %j", (value) => {
    expect(getSafeRedirectPath(value, origin)).toBe("/dashboard");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "https://acme.test.evil.com",
    "javascript:alert(1)",
  ])("rejects off-site target %s", (value) => {
    expect(getSafeRedirectPath(value, origin)).toBe("/dashboard");
  });
});

describe("withRedirectTo", () => {
  it("omits the parameter for the default destination", () => {
    expect(withRedirectTo("/sign-in", "/dashboard")).toBe("/sign-in");
  });

  it("encodes other destinations", () => {
    expect(withRedirectTo("/sign-in", "/dashboard/settings/billing?x=1")).toBe(
      "/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fbilling%3Fx%3D1"
    );
  });
});
