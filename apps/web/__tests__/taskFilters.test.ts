import { Settings as LuxonSettings } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bucketByDay, formatDueDate, isOverdue } from "@/lib/format";

const NOW = new Date("2026-05-15T12:00:00Z");

describe("today / upcoming bucketing", () => {
  beforeAll(() => {
    LuxonSettings.now = () => NOW.getTime();
  });
  afterAll(() => {
    LuxonSettings.now = () => Date.now();
  });

  it("formats relative day labels", () => {
    expect(formatDueDate(new Date("2026-05-15T15:00:00Z"))).toBe("Today");
    expect(formatDueDate(new Date("2026-05-16T01:00:00Z"))).toBe("Tomorrow");
    expect(formatDueDate(new Date("2026-05-14T15:00:00Z"))).toBe("Yesterday");
  });

  it("uses weekday names within the next week", () => {
    // 2026-05-15 is a Friday → 4 days from Tuesday will be a weekday name.
    const inFourDays = new Date("2026-05-19T15:00:00Z");
    const label = formatDueDate(inFourDays);
    expect(label).toMatch(/Tuesday/);
  });

  it("isOverdue handles all-day vs timed tasks", () => {
    expect(isOverdue(new Date("2026-05-14T00:00:00Z"))).toBe(true);
    expect(isOverdue(new Date("2026-05-15T00:00:00Z"))).toBe(false);
    // timed → comparison includes the time component
    expect(isOverdue(new Date("2026-05-15T08:00:00Z"), true)).toBe(true);
    expect(isOverdue(new Date("2026-05-15T15:00:00Z"), true)).toBe(false);
  });

  it("buckets tasks by ISO day", () => {
    const tasks = [
      { dueAt: new Date("2026-05-15T07:00:00Z") },
      { dueAt: new Date("2026-05-15T20:00:00Z") },
      { dueAt: new Date("2026-05-16T09:00:00Z") },
      { dueAt: new Date("2026-05-17T09:00:00Z") },
      { dueAt: null },
    ];
    const buckets = bucketByDay(tasks);
    expect(buckets).toHaveLength(3);
    const day0 = buckets[0];
    if (!day0) throw new Error("missing day0");
    expect(day0.items).toHaveLength(2);
    expect(day0.label.startsWith("Today")).toBe(true);
    const day1 = buckets[1];
    if (!day1) throw new Error("missing day1");
    expect(day1.label.startsWith("Tomorrow")).toBe(true);
  });

  it("ignores tasks without a due date", () => {
    const buckets = bucketByDay([{ dueAt: null }, { dueAt: null }]);
    expect(buckets).toHaveLength(0);
  });
});
