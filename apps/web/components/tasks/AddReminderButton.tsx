"use client";

import * as React from "react";
import { CalendarPlus } from "lucide-react";
import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface Props {
  /** Default suggestion (used to seed the picker), e.g. the task's due date. */
  defaultDate?: Date | null;
  onAdd: (remindAt: Date) => void;
  disabled?: boolean;
}

/**
 * Compact "Add reminder" popover with calendar + time input. Sits inside
 * the TaskDetailDrawer's Reminders section.
 */
export function AddReminderButton({ defaultDate, onAdd, disabled }: Props) {
  const seed = defaultDate
    ? DateTime.fromJSDate(defaultDate)
    : DateTime.now().plus({ hours: 1 }).startOf("hour");

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date>(seed.startOf("day").toJSDate());
  const [time, setTime] = React.useState<string>(seed.toFormat("HH:mm"));

  function commit() {
    const [h, m] = time.split(":").map((s) => parseInt(s, 10));
    const result = DateTime.fromJSDate(date)
      .set({ hour: h ?? 9, minute: m ?? 0, second: 0, millisecond: 0 })
      .toJSDate();
    onAdd(result);
    setOpen(false);
  }

  function preset(dt: DateTime) {
    onAdd(dt.toJSDate());
    setOpen(false);
  }

  const inOneHour = DateTime.now().plus({ hours: 1 }).startOf("minute");
  const tomorrowMorning = DateTime.now()
    .plus({ days: 1 })
    .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  const nextWeek = DateTime.now()
    .plus({ weeks: 1 })
    .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <CalendarPlus className="size-4" />
          Add reminder
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="grid gap-1 p-2">
          <Button variant="ghost" className="justify-start" onClick={() => preset(inOneHour)}>
            <span>In 1 hour</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {inOneHour.toFormat("h:mm a")}
            </span>
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => preset(tomorrowMorning)}>
            <span>Tomorrow at 9:00</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {tomorrowMorning.toFormat("ccc, LLL d")}
            </span>
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => preset(nextWeek)}>
            <span>Next week at 9:00</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {nextWeek.toFormat("ccc, LLL d")}
            </span>
          </Button>
        </div>
        <Separator />
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          disabled={(d) => d < DateTime.now().startOf("day").toJSDate()}
        />
        <Separator />
        <div className="flex items-center gap-2 p-2">
          <Label className="text-sm">Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="ml-auto h-8 w-32"
          />
          <Button size="sm" onClick={commit}>
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
