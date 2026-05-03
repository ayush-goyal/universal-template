import { describe, expect, it } from "vitest";

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
