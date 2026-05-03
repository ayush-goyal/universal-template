import { describe, expect, it } from "vitest";

import { parseQuickAdd } from "../lib/quickAdd";

describe("parseQuickAdd", () => {
  const fixedNow = new Date("2026-05-15T08:00:00Z"); // Friday

  it("extracts priority", () => {
    const r = parseQuickAdd("Pay rent p1", fixedNow);
    expect(r.priority).toBe(1);
    expect(r.title).toBe("Pay rent");
  });

  it("extracts !p syntax", () => {
    const r = parseQuickAdd("Buy milk !p2", fixedNow);
    expect(r.priority).toBe(2);
    expect(r.title).toBe("Buy milk");
  });

  it("extracts project and labels", () => {
    const r = parseQuickAdd("Email mom #Family @phone @urgent", fixedNow);
    expect(r.projectName).toBe("Family");
    expect(r.labelNames).toEqual(["phone", "urgent"]);
    expect(r.title).toBe("Email mom");
  });

  it("recognises tomorrow", () => {
    const r = parseQuickAdd("Call dentist tomorrow", fixedNow);
    expect(r.dueAt).toBeInstanceOf(Date);
    expect(r.dueAt?.toISOString().slice(0, 10)).toBe("2026-05-16");
    expect(r.title).toBe("Call dentist");
  });

  it("recognises a time and weekday", () => {
    const r = parseQuickAdd("Standup monday 9am", fixedNow);
    expect(r.dueAt).toBeInstanceOf(Date);
    expect(r.dueHasTime).toBe(true);
    expect(r.title).toBe("Standup");
  });

  it("preserves recurrence", () => {
    const r = parseQuickAdd("Workout every day", fixedNow);
    expect(r.recurrence).toBe("every day");
    expect(r.title).toBe("Workout");
  });

  it("handles a complex string", () => {
    const r = parseQuickAdd("Pay rent every 1st 9am p1 #Home @money", fixedNow);
    expect(r.priority).toBe(1);
    expect(r.projectName).toBe("Home");
    expect(r.labelNames).toEqual(["money"]);
    expect(r.recurrence).toBe("every 1st");
    expect(r.title).toBe("Pay rent");
    expect(r.dueHasTime).toBe(true);
  });
});
