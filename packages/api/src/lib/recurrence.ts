import { DateTime } from "luxon";

/**
 * Lightweight recurrence engine. Supports a small grammar that maps to
 * Todoist's natural-language patterns:
 *
 *   "daily"               | "every day"
 *   "weekdays"            | "every weekday"
 *   "weekly"              | "every week"
 *   "every monday"        | "every tuesday" ... "every sunday"
 *   "monthly"             | "every month"
 *   "every Nth"           (e.g. "every 1st", "every 15th")
 *   "yearly"              | "every year"
 *
 * Stored canonically in the `Task.recurrence` column as the lowercased text.
 */
export type ParsedRecurrence =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "weekly"; weekday?: number /* 1=Monday..7=Sunday (luxon) */ }
  | { kind: "monthly"; dayOfMonth?: number }
  | { kind: "yearly" };

const WEEKDAYS: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

export function parseRecurrence(raw: string | null | undefined): ParsedRecurrence | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");

  if (text === "daily" || text === "every day") return { kind: "daily" };
  if (text === "weekdays" || text === "every weekday") return { kind: "weekdays" };
  if (text === "weekly" || text === "every week") return { kind: "weekly" };
  if (text === "monthly" || text === "every month") return { kind: "monthly" };
  if (text === "yearly" || text === "every year") return { kind: "yearly" };

  const everyDay = /^every (mon|tues|wednes|thurs|fri|satur|sun)day$/.exec(text);
  if (everyDay) {
    const full = `${everyDay[1]}day`;
    const wd = WEEKDAYS[full];
    if (wd) return { kind: "weekly", weekday: wd };
  }

  const everyNth = /^every (\d+)(st|nd|rd|th)$/.exec(text);
  if (everyNth) {
    const dom = parseInt(everyNth[1] ?? "0", 10);
    if (dom >= 1 && dom <= 31) return { kind: "monthly", dayOfMonth: dom };
  }

  return null;
}

/**
 * Compute the next occurrence after the provided reference date. Returns null
 * if the recurrence string can't be parsed. Time-of-day is preserved from the
 * `from` date when available.
 */
export function nextOccurrence(
  recurrence: string | null | undefined,
  from: Date | null | undefined
): Date | null {
  const parsed = parseRecurrence(recurrence);
  if (!parsed) return null;

  // If we don't have a reference date, anchor on now.
  const anchor = from ? DateTime.fromJSDate(from) : DateTime.now();

  switch (parsed.kind) {
    case "daily":
      return anchor.plus({ days: 1 }).toJSDate();
    case "weekdays": {
      // Skip Sat/Sun.
      let next = anchor.plus({ days: 1 });
      while (next.weekday === 6 || next.weekday === 7) {
        next = next.plus({ days: 1 });
      }
      return next.toJSDate();
    }
    case "weekly": {
      if (!parsed.weekday) return anchor.plus({ weeks: 1 }).toJSDate();
      // Find the next occurrence of the requested weekday strictly after anchor.
      let next = anchor.plus({ days: 1 });
      while (next.weekday !== parsed.weekday) {
        next = next.plus({ days: 1 });
      }
      return next.toJSDate();
    }
    case "monthly": {
      const dom = parsed.dayOfMonth ?? anchor.day;
      let candidate = anchor.set({ day: 1 }).plus({ months: 1 });
      const lastDay = candidate.daysInMonth ?? 28;
      candidate = candidate.set({ day: Math.min(dom, lastDay) });
      // Preserve the original time of day.
      candidate = candidate.set({
        hour: anchor.hour,
        minute: anchor.minute,
        second: anchor.second,
        millisecond: anchor.millisecond,
      });
      return candidate.toJSDate();
    }
    case "yearly":
      return anchor.plus({ years: 1 }).toJSDate();
  }
}
