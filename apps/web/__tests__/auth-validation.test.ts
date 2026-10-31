import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/lib/auth-redirect";

describe("auth redirects", () => {
  it.each([
    null,
    "https://evil.example",
    "//evil.example",
    "//",
    "///",
    "/\\evil.example",
    "javascript:alert(1)",
    "/\n/evil.example",
    "/foo/..//evil.example",
    "/%2e%2e//evil.example",
  ])("rejects unsafe destination %j", (destination) => {
    expect(getSafeRedirect(destination)).toBe("/dashboard");
  });

  it("preserves local paths and query strings", () => {
    expect(getSafeRedirect("/pricing?annual=true#plans")).toBe("/pricing?annual=true#plans");
  });
});
