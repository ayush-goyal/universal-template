"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatDueDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value: Date | null | undefined;
  hasTime: boolean;
  onChange: (date: Date | null, hasTime: boolean) => void;
  size?: "sm" | "default";
}

export function DueDatePicker({ value, hasTime, onChange, size = "sm" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState(
    value ? DateTime.fromJSDate(value).toFormat("HH:mm") : "09:00"
  );

  const overdue = value && isOverdue(value, hasTime);

  function setQuick(date: Date) {
    if (hasTime) {
      const [h, m] = time.split(":").map((s) => parseInt(s, 10));
      date.setHours(h ?? 9, m ?? 0, 0, 0);
    }
    onChange(date, hasTime);
    setOpen(false);
  }

  function clear() {
    onChange(null, false);
    setOpen(false);
  }

  const today = new Date();
  const tomorrow = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
  const nextWeek = DateTime.now().plus({ weeks: 1 }).startOf("day").toJSDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          className={cn(
            "text-muted-foreground gap-1.5",
            value && "text-foreground",
            overdue && "text-destructive"
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? <span>{formatDueDate(value, hasTime)}</span> : <span>Due date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="grid gap-1 p-2">
          <Button variant="ghost" className="justify-start" onClick={() => setQuick(today)}>
            <span>Today</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {DateTime.fromJSDate(today).toFormat("ccc")}
            </span>
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => setQuick(tomorrow)}>
            <span>Tomorrow</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {DateTime.fromJSDate(tomorrow).toFormat("ccc")}
            </span>
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => setQuick(nextWeek)}>
            <span>Next week</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {DateTime.fromJSDate(nextWeek).toFormat("ccc, LLL d")}
            </span>
          </Button>
        </div>
        <Separator />
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            if (!d) return;
            setQuick(d);
          }}
        />
        <Separator />
        <div className="flex items-center gap-2 p-2">
          <Switch
            checked={hasTime}
            onCheckedChange={(checked) => {
              if (!value) return;
              if (checked) {
                const [h, m] = time.split(":").map((s) => parseInt(s, 10));
                const d = new Date(value);
                d.setHours(h ?? 9, m ?? 0, 0, 0);
                onChange(d, true);
              } else {
                const d = new Date(value);
                d.setHours(0, 0, 0, 0);
                onChange(d, false);
              }
            }}
          />
          <Label className="text-sm">Set time</Label>
          {hasTime && value ? (
            <Input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                const [h, m] = e.target.value.split(":").map((s) => parseInt(s, 10));
                const d = new Date(value);
                d.setHours(h ?? 9, m ?? 0, 0, 0);
                onChange(d, true);
              }}
              className="ml-auto h-8 w-28"
            />
          ) : null}
        </div>
        {value ? (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="text-destructive w-full justify-start"
              onClick={clear}
            >
              <X className="size-4" /> Remove due date
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
