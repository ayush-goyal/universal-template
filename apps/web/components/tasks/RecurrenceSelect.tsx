"use client";

import * as React from "react";
import { Repeat, X } from "lucide-react";
import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  /** Stored recurrence string (e.g. "daily", "every monday", "every 1st"). */
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  /** When set, the "every <weekday>" / "every Nth" presets default to that day. */
  anchorDate?: Date | null;
  size?: "sm" | "default";
}

const WEEKDAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/**
 * Compact recurrence picker. The stored string maps 1:1 to
 * `parseRecurrence` in `packages/api/src/lib/recurrence.ts` so the server
 * always understands what we send.
 */
export function RecurrenceSelect({ value, onChange, anchorDate, size = "sm" }: Props) {
  const [open, setOpen] = React.useState(false);

  const anchor = anchorDate ? DateTime.fromJSDate(anchorDate) : DateTime.now();
  const weekdayName = WEEKDAY_NAMES[Math.max(0, anchor.weekday - 1)] ?? "monday";
  const dayOfMonth = anchor.day;

  const presets: { label: string; rule: string | null }[] = [
    { label: "No repeat", rule: null },
    { label: "Daily", rule: "daily" },
    { label: "Weekdays (Mon–Fri)", rule: "weekdays" },
    {
      label: `Every ${weekdayName.charAt(0).toUpperCase()}${weekdayName.slice(1)}`,
      rule: `every ${weekdayName}`,
    },
    {
      label: `Monthly on the ${ordinal(dayOfMonth)}`,
      rule: `every ${ordinal(dayOfMonth)}`,
    },
    { label: "Yearly", rule: "yearly" },
  ];

  function pick(rule: string | null) {
    onChange(rule);
    setOpen(false);
  }

  const buttonLabel = value ? value.charAt(0).toUpperCase() + value.slice(1) : "Repeat";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          className={cn("text-muted-foreground gap-1.5", value && "text-foreground")}
        >
          <Repeat className="size-4" />
          <span>{buttonLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <div className="grid gap-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => pick(p.rule)}
              className={cn(
                "hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm",
                value === p.rule && "bg-accent",
                p.rule === null && "text-muted-foreground"
              )}
            >
              <span>{p.label}</span>
              {p.rule ? (
                <span className="text-muted-foreground font-mono text-[10px]">{p.rule}</span>
              ) : null}
            </button>
          ))}
        </div>
        {value ? (
          <>
            <Separator className="my-1" />
            <button
              type="button"
              onClick={() => pick(null)}
              className="text-destructive hover:bg-accent flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm"
            >
              <X className="size-4" /> Remove repeat
            </button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
