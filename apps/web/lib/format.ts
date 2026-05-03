import { DateTime } from "luxon";

export function formatDueDate(date: Date | string | null | undefined, hasTime = false): string {
  if (!date) return "";
  const dt = typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  if (!dt.isValid) return "";
  const now = DateTime.now();
  const sameDay = dt.hasSame(now, "day");
  const tomorrow = dt.hasSame(now.plus({ days: 1 }), "day");
  const yesterday = dt.hasSame(now.minus({ days: 1 }), "day");
  const sameYear = dt.hasSame(now, "year");

  let label: string;
  if (sameDay) label = "Today";
  else if (tomorrow) label = "Tomorrow";
  else if (yesterday) label = "Yesterday";
  else if (Math.abs(dt.diff(now, "days").days) < 7) label = dt.toFormat("cccc");
  else if (sameYear) label = dt.toFormat("LLL d");
  else label = dt.toFormat("LLL d, yyyy");

  if (hasTime) {
    return `${label}, ${dt.toFormat("h:mm a")}`;
  }
  return label;
}

export function isOverdue(date: Date | string | null | undefined, hasTime = false): boolean {
  if (!date) return false;
  const dt = typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  if (!dt.isValid) return false;
  const now = DateTime.now();
  if (hasTime) return dt < now;
  return dt.endOf("day") < now.startOf("day");
}

export function bucketByDay<T extends { dueAt: Date | string | null }>(
  tasks: T[]
): { label: string; items: T[]; key: string }[] {
  const map = new Map<string, T[]>();
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const dt =
      typeof t.dueAt === "string" ? DateTime.fromISO(t.dueAt) : DateTime.fromJSDate(t.dueAt);
    const key = dt.toISODate() ?? "unknown";
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const dt = DateTime.fromISO(key);
      const now = DateTime.now();
      let label = dt.toFormat("cccc, LLL d");
      if (dt.hasSame(now, "day")) label = `Today · ${dt.toFormat("cccc, LLL d")}`;
      else if (dt.hasSame(now.plus({ days: 1 }), "day"))
        label = `Tomorrow · ${dt.toFormat("cccc, LLL d")}`;
      return { key, label, items };
    });
}
