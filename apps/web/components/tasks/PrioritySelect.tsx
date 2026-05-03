"use client";

import * as React from "react";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORITY_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

export type TaskPriority = 1 | 2 | 3 | 4;

const LABELS: Record<TaskPriority, string> = {
  1: "P1 — Critical",
  2: "P2 — High",
  3: "P3 — Medium",
  4: "P4 — Low",
};

interface Props {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  size?: "sm" | "default";
  trigger?: React.ReactNode;
}

export function PrioritySelect({ value, onChange, size = "sm", trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const colors = PRIORITY_COLORS[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size={size === "sm" ? "icon" : "sm"}
            className={cn("text-muted-foreground gap-1.5", colors.dot)}
            aria-label={`Priority ${value}`}
          >
            <Flag className={cn("size-4", value !== 4 && "fill-current")} />
            {size !== "sm" ? <span className="text-xs">P{value}</span> : null}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {([1, 2, 3, 4] as TaskPriority[]).map((p) => {
          const c = PRIORITY_COLORS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                value === p && "bg-accent"
              )}
            >
              <Flag className={cn("size-4", p !== 4 && "fill-current", c.dot)} />
              <span>{LABELS[p]}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
