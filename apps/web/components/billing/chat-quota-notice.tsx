"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUsage } from "@/hooks/use-billing";

/**
 * Inline reminder of what is left of the free plan's daily message allowance.
 *
 * Advisory only — `chat` enforces the same quota server-side, so this going stale costs nothing but
 * a slightly confusing error. Renders nothing on an unlimited plan.
 */
export function ChatQuotaNotice() {
  const { data } = useUsage();
  const usage = data?.aiMessages;

  if (!usage || usage.limit === null) return null;

  const exhausted = usage.remaining === 0;

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>
        {exhausted
          ? "You have used today's free messages."
          : `${usage.remaining} of ${usage.limit} messages left today`}
      </span>
      <Button asChild size="sm" variant={exhausted ? "default" : "link"} className="h-6 px-2">
        <Link href="/pricing">
          <Sparkles className="size-3" aria-hidden />
          Upgrade
        </Link>
      </Button>
    </div>
  );
}
