import { Settings as LuxonSettings } from "luxon";
import { afterEach, describe, expect, it } from "vitest";

import { nextOccurrence, parseRecurrence } from "../lib/recurrence";

describe("parseRecurrence", () => {
  it("parses common shorthands", () => {
    expect(parseRecurrence("daily")?.kind).toBe("daily");
    expect(parseRecurrence("every day")?.kind).toBe("daily");
    expect(parseRecurrence("weekdays")?.kind).toBe("weekdays");
    expect(parseRecurrence("every weekday")?.kind).toBe("weekdays");
    expect(parseRecurrence("weekly")?.kind).toBe("weekly");
    expect(parseRecurrence("monthly")?.kind).toBe("monthly");
    expect(parseRecurrence("yearly")?.kind).toBe("yearly");
  });

  it("parses every-weekday", () => {
    expect(parseRecurrence("every monday")).toEqual({ kind: "weekly", weekday: 1 });
    expect(parseRecurrence("every sunday")).toEqual({ kind: "weekly", weekday: 7 });
  });

  it("parses every-Nth as monthly", () => {
    expect(parseRecurrence("every 1st")).toEqual({ kind: "monthly", dayOfMonth: 1 });
    expect(parseRecurrence("every 15th")).toEqual({ kind: "monthly", dayOfMonth: 15 });
  });

  it("returns null for nonsense", () => {
    expect(parseRecurrence("never")).toBeNull();
    expect(parseRecurrence("")).toBeNull();
    expect(parseRecurrence(null)).toBeNull();
  });
});

describe("nextOccurrence", () => {
  it("daily advances by one day", () => {
    const d = new Date("2026-05-01T09:00:00Z");
    const n = nextOccurrence("daily", d);
    expect(n?.toISOString()).toBe("2026-05-02T09:00:00.000Z");
  });

  it("weekdays skips weekends", () => {
    // 2026-05-01 is a Friday (weekday=5). Next is Monday 2026-05-04.
    const fri = new Date("2026-05-01T09:00:00Z");
    const next = nextOccurrence("weekdays", fri);
    expect(next).toBeTruthy();
    expect(next?.getUTCDay()).toBe(1); // Monday
  });

  it("every monday lands on the next Monday", () => {
    // 2026-05-01 is a Friday → next Monday 2026-05-04
    const fri = new Date("2026-05-01T09:00:00Z");
    const next = nextOccurrence("every monday", fri);
    expect(next).toBeTruthy();
    expect(next?.getUTCDay()).toBe(1);
  });

  it("monthly Nth picks the same Nth in the next month", () => {
    const d = new Date("2026-05-15T10:30:00Z");
    const next = nextOccurrence("every 15th", d);
    expect(next).toBeTruthy();
    expect(next?.getUTCMonth()).toBe(5); // June (0-indexed)
    expect(next?.getUTCDate()).toBe(15);
  });

  it("returns null for unparseable input", () => {
    expect(nextOccurrence("foo", new Date())).toBeNull();
  });
});

describe("nextOccurrence across DST boundaries", () => {
  // We anchor the default zone to America/New_York which observes DST. Luxon's
  // calendar arithmetic should preserve the wall-clock time when crossing
  // the spring-forward / fall-back transitions.
  const previousZone = LuxonSettings.defaultZone;

  afterEach(() => {
    LuxonSettings.defaultZone = previousZone;
  });

  it("daily preserves wall-clock 9 AM across spring-forward (Mar 9, 2025)", () => {
    LuxonSettings.defaultZone = "America/New_York";
    // 9 AM EST on 2025-03-08 (still standard time) → next day is EDT.
    // EST = UTC-5  → 9 AM = 14:00Z; EDT = UTC-4 → 9 AM = 13:00Z.
    const before = new Date("2025-03-08T14:00:00Z");
    const next = nextOccurrence("daily", before);
    expect(next).toBeTruthy();
    // Wall-clock should still read 9:00 → which is 13:00Z under EDT.
    expect(next?.toISOString()).toBe("2025-03-09T13:00:00.000Z");
  });

  it("daily preserves wall-clock across fall-back (Nov 2, 2025)", () => {
    LuxonSettings.defaultZone = "America/New_York";
    // 9 AM EDT on 2025-11-01 (UTC-4 → 13:00Z) → 9 AM EST on 2025-11-02 (UTC-5 → 14:00Z)
    const before = new Date("2025-11-01T13:00:00Z");
    const next = nextOccurrence("daily", before);
    expect(next?.toISOString()).toBe("2025-11-02T14:00:00.000Z");
  });

  it("weekdays preserves wall-clock when stepping across spring-forward", () => {
    LuxonSettings.defaultZone = "America/New_York";
    // 2025-03-07 is a Friday under EST. Next weekday is Monday 2025-03-10
    // which is in EDT — wall-clock 9 AM should be preserved.
    const fri9amEst = new Date("2025-03-07T14:00:00Z");
    const next = nextOccurrence("weekdays", fri9amEst);
    expect(next?.toISOString()).toBe("2025-03-10T13:00:00.000Z");
  });

  it("every monday preserves wall-clock across fall-back", () => {
    LuxonSettings.defaultZone = "America/New_York";
    // 2025-10-27 (Mon) 9 AM EDT = 13:00Z → next Monday 2025-11-03 9 AM EST = 14:00Z
    const monEdt = new Date("2025-10-27T13:00:00Z");
    const next = nextOccurrence("every monday", monEdt);
    expect(next?.toISOString()).toBe("2025-11-03T14:00:00.000Z");
  });

  it("monthly Nth preserves wall-clock when bridging a DST transition", () => {
    LuxonSettings.defaultZone = "America/New_York";
    // Feb 15, 2025 9 AM EST (14:00Z). Next occurrence Mar 15, 2025 — by then
    // EDT is in effect, so 9 AM = 13:00Z.
    const feb = new Date("2025-02-15T14:00:00Z");
    const next = nextOccurrence("every 15th", feb);
    expect(next?.toISOString()).toBe("2025-03-15T13:00:00.000Z");
  });
});
