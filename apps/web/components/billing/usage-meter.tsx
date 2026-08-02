"use client";

import { DateTime } from "luxon";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks/use-billing";

/**
 * How much of today's metered allowance is left.
 *
 * Renders nothing on an unlimited plan — a full bar that can never move is noise.
 */
export function UsageMeter({ className }: { className?: string }) {
  const { data, isPending } = useUsage();

  if (isPending) return <Skeleton className="h-12 w-full" />;

  const usage = data?.aiMessages;
  if (!usage || usage.limit === null) return null;

  const percentUsed = Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span>AI messages today</span>
        <span className="text-muted-foreground tabular-nums">
          {usage.used} / {usage.limit}
        </span>
      </div>
      <Progress value={percentUsed} />
      {usage.resetsAt ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Resets {DateTime.fromJSDate(usage.resetsAt).toRelative()}
        </p>
      ) : null}
    </div>
  );
}
