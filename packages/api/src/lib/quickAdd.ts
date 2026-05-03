import { DateTime } from "luxon";

/**
 * Result of quick-add NL parsing. The frontend then resolves project/label
 * names against the user's actual projects/labels (case-insensitive) before
 * calling tasks.create.
 */
export interface QuickAddParsed {
  title: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  dueAt?: Date;
  dueHasTime?: boolean;
  recurrence?: string;
  projectName?: string;
  labelNames?: string[];
}

const PRIORITY_RE = /(?:^|\s)!?p([1-4])(?=\s|$)/i;
const PROJECT_RE = /(?:^|\s)#([a-z0-9_-]+)/i;
const LABEL_RE_GLOBAL = /(?:^|\s)@([a-z0-9_-]+)/gi;
const TIME_RE =
  /(?:^|\s)(?:at\s+)?((?:[01]?\d|2[0-3]):[0-5]\d|(?:1[0-2]|[1-9])(?:\s?(?:am|pm)))(?=\s|$)/i;
const RECURRENCE_RE =
  /(?:^|\s)(every\s+(?:day|week|month|year|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+(?:st|nd|rd|th))|daily|weekdays|weekly|monthly|yearly)(?=\s|$)/i;
const RELATIVE_DAY_RE = /(?:^|\s)(today|tomorrow|tonight|yesterday)(?=\s|$)/i;
const NEXT_WEEKDAY_RE =
  /(?:^|\s)(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=\s|$)/i;

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
};

function parseTime(raw: string): { hour: number; minute: number } | null {
  const v = raw.trim().toLowerCase();
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm)$/.exec(v);
  if (ampm) {
    let h = parseInt(ampm[1] ?? "0", 10);
    const m = parseInt(ampm[2] ?? "0", 10);
    if (ampm[3] === "pm" && h !== 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    return { hour: h, minute: m };
  }
  const hm = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (hm) {
    return { hour: parseInt(hm[1] ?? "0", 10), minute: parseInt(hm[2] ?? "0", 10) };
  }
  return null;
}

/**
 * Parses a Todoist-style quick-add string. Accepts:
 *   - "#project" → projectName
 *   - "@label"   → labelNames[]
 *   - "p1"/"!p1" → priority (1 highest .. 4 lowest)
 *   - "today"/"tomorrow"/weekday name → dueAt date
 *   - "9am"/"15:30" → time, sets dueHasTime
 *   - recurrence keyword (every day, weekdays, every monday, etc.)
 *
 * Anything left over becomes the title. The caller is responsible for
 * resolving projectName/labelNames against the user's data.
 */
export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddParsed {
  let text = input.trim();
  const result: QuickAddParsed = { title: "" };

  const priorityMatch = PRIORITY_RE.exec(text);
  if (priorityMatch) {
    result.priority = parseInt(priorityMatch[1] ?? "4", 10) as 1 | 2 | 3 | 4;
    text = text.replace(priorityMatch[0], " ").trim();
  }

  const projectMatch = PROJECT_RE.exec(text);
  if (projectMatch) {
    result.projectName = projectMatch[1];
    text = text.replace(projectMatch[0], " ").trim();
  }

  const labels: string[] = [];
  text = text.replace(LABEL_RE_GLOBAL, (_, name: string) => {
    labels.push(name);
    return " ";
  });
  if (labels.length) result.labelNames = labels;

  const recurrenceMatch = RECURRENCE_RE.exec(text);
  if (recurrenceMatch) {
    result.recurrence = (recurrenceMatch[1] ?? "").toLowerCase();
    text = text.replace(recurrenceMatch[0], " ").trim();
  }

  // Day phrases.
  let dt = DateTime.fromJSDate(now);
  let touchedDay = false;
  const rel = RELATIVE_DAY_RE.exec(text);
  if (rel) {
    const word = (rel[1] ?? "").toLowerCase();
    if (word === "today" || word === "tonight") {
      // keep today
    } else if (word === "tomorrow") {
      dt = dt.plus({ days: 1 });
    } else if (word === "yesterday") {
      dt = dt.minus({ days: 1 });
    }
    if (word === "tonight") {
      dt = dt.set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
      result.dueHasTime = true;
    }
    touchedDay = true;
    text = text.replace(rel[0], " ").trim();
  }
  if (!touchedDay) {
    const wd = NEXT_WEEKDAY_RE.exec(text);
    if (wd) {
      const target = WEEKDAY_INDEX[(wd[1] ?? "").toLowerCase()];
      if (target) {
        let cursor = dt.plus({ days: 1 });
        while (cursor.weekday !== target) cursor = cursor.plus({ days: 1 });
        dt = cursor;
        touchedDay = true;
        text = text.replace(wd[0], " ").trim();
      }
    }
  }

  const timeMatch = TIME_RE.exec(text);
  if (timeMatch) {
    const parsed = parseTime(timeMatch[1] ?? "");
    if (parsed) {
      dt = dt.set({ ...parsed, second: 0, millisecond: 0 });
      result.dueHasTime = true;
      touchedDay = true;
    }
    text = text.replace(timeMatch[0], " ").trim();
  }

  if (touchedDay) {
    if (!result.dueHasTime) {
      // Default to start of day.
      dt = dt.startOf("day");
    }
    result.dueAt = dt.toJSDate();
  }

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}
