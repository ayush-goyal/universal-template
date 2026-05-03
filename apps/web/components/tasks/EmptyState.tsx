import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  variant?: "card" | "plain";
}

/**
 * Calm empty state used across smart views and project pages. Designed to
 * feel like a soft pause rather than an error.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "card",
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "card"
          ? "border-border bg-muted/30 rounded-lg border border-dashed px-4 py-10"
          : "py-8",
        className
      )}
    >
      {Icon ? (
        <div className="bg-primary/10 text-primary mb-3 inline-flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" />
        </div>
      ) : null}
      <h3 className="text-foreground text-sm font-medium">{title}</h3>
      {description ? (
        <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
