import { DateTime, Settings as LuxonSettings } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bucketByDay, formatDueDate, isOverdue } from "@/lib/format";

describe("format helpers", () => {
  beforeAll(() => {
    LuxonSettings.now = () => new Date("2026-05-15T12:00:00Z").getTime();
  });
  afterAll(() => {
    LuxonSettings.now = () => Date.now();
  });

  it("formats today/tomorrow/yesterday", () => {
    const today = new Date("2026-05-15T15:00:00Z");
    const tomorrow = new Date("2026-05-16T15:00:00Z");
    const yesterday = new Date("2026-05-14T15:00:00Z");
    expect(formatDueDate(today)).toBe("Today");
    expect(formatDueDate(tomorrow)).toBe("Tomorrow");
    expect(formatDueDate(yesterday)).toBe("Yesterday");
  });

  it("isOverdue is true for past dates without time", () => {
    expect(isOverdue(new Date("2026-05-14T00:00:00Z"))).toBe(true);
    expect(isOverdue(new Date("2026-05-15T00:00:00Z"))).toBe(false);
  });

  it("bucketByDay groups by ISO date", () => {
    const tasks = [
      { dueAt: new Date("2026-05-15T10:00:00Z") },
      { dueAt: new Date("2026-05-16T10:00:00Z") },
      { dueAt: new Date("2026-05-15T15:00:00Z") },
    ];
    const buckets = bucketByDay(tasks);
    expect(buckets).toHaveLength(2);
    const day0 = buckets[0];
    if (!day0) throw new Error("missing");
    expect(day0.items).toHaveLength(2);
    const day1 = buckets[1];
    if (!day1) throw new Error("missing");
    expect(day1.items).toHaveLength(1);
  });

  it("formatDueDate respects time", () => {
    const dt = DateTime.fromISO("2026-05-15T15:30:00Z").toJSDate();
    const result = formatDueDate(dt, true);
    expect(result.startsWith("Today, ")).toBe(true);
  });
});
