"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayPage() {
  const trpc = useTRPC();
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const aiStatus = useQuery(trpc.ai.status.queryOptions());
  const planMyDay = useMutation(
    trpc.ai.planMyDay.mutationOptions({
      onSuccess: (r) => {
        setPlan(r.plan);
        setPlanOpen(true);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const aiAvailable = aiStatus.data?.enabled && aiStatus.data?.plan === "pro";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-muted-foreground size-6" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
            <p className="text-muted-foreground text-sm">
              Your tasks for today, plus anything overdue.
            </p>
          </div>
        </div>
        {aiAvailable ? (
          <Button
            variant="outline"
            onClick={() => planMyDay.mutate()}
            disabled={planMyDay.isPending}
          >
            <Sparkles className="text-primary size-4" />
            {planMyDay.isPending ? "Thinking…" : "Plan my day"}
          </Button>
        ) : null}
      </header>
      <TaskList
        filter={{ smart: "today" }}
        groupBy="day"
        emptyState="Nothing scheduled for today. ✨"
      />

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-4" /> Plan my day
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {plan ? <ReactMarkdown>{plan}</ReactMarkdown> : <Skeleton className="h-32 w-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
