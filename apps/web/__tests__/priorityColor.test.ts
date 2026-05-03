import { describe, expect, it } from "vitest";

import { colorClasses, PRIORITY_COLORS, PROJECT_COLORS } from "@/lib/colors";

describe("colorClasses", () => {
  it("returns matching class set for each known token", () => {
    for (const c of PROJECT_COLORS) {
      const cc = colorClasses(c);
      expect(cc.dot).toMatch(/^bg-/);
      expect(cc.bg).toMatch(/^bg-/);
      expect(cc.text).toMatch(/^text-/);
    }
  });

  it("falls back to sage for unknown tokens", () => {
    const sage = colorClasses("sage");
    expect(colorClasses("not-a-color")).toEqual(sage);
    expect(colorClasses(null)).toEqual(sage);
    expect(colorClasses(undefined)).toEqual(sage);
  });
});

describe("PRIORITY_COLORS", () => {
  it("covers all priority levels 1-4", () => {
    for (const p of [1, 2, 3, 4] as const) {
      const c = PRIORITY_COLORS[p];
      expect(c.dot).toBeTruthy();
      expect(c.text).toBeTruthy();
    }
  });

  it("uses muted styling for the lowest priority", () => {
    expect(PRIORITY_COLORS[4].text).toBe("text-muted-foreground");
  });
});
