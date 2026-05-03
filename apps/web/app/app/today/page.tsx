"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, CalendarDays, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { DateTime } from "luxon";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

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

  const dailySummary = useMutation(
    trpc.ai.dailySummary.mutationOptions({
      onSuccess: (r) => {
        setSummary(r.summary);
        setSummaryOpen(true);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const todaysTasks = useQuery(trpc.tasks.list.queryOptions({ smart: "today" }));
  const reorder = useMutation(
    trpc.tasks.reorder.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        toast.success("Today's list reordered");
        setPlanOpen(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  /**
   * Heuristic local reorder: priority asc (1 first), then due time asc.
   * The plan called for an "AI suggestion + Reorder my list" pair; the
   * AI provides the rationale (rendered in the dialog) while the reorder
   * itself stays deterministic so it's understandable and testable.
   */
  function applyReorder() {
    if (!todaysTasks.data?.length) return;
    const sorted = [...todaysTasks.data].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const at = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bt = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return at - bt;
    });
    reorder.mutate({ orderedIds: sorted.map((t) => t.id) });
  }

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => dailySummary.mutate()}
              disabled={dailySummary.isPending}
            >
              <Wand2 className="text-primary size-4" />
              {dailySummary.isPending ? "Reflecting…" : "Daily summary"}
            </Button>
            <Button
              variant="outline"
              onClick={() => planMyDay.mutate()}
              disabled={planMyDay.isPending}
            >
              <Sparkles className="text-primary size-4" />
              {planMyDay.isPending ? "Thinking…" : "Plan my day"}
            </Button>
          </div>
        ) : null}
      </header>
      <TaskList
        filter={{ smart: "today" }}
        groupBy="day"
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="Nothing scheduled for today"
            description="A clear day. Add something or take a break."
            variant="plain"
          />
        }
      />

      <CompletedTodaySection />

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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanOpen(false)}>
              Close
            </Button>
            <Button
              onClick={applyReorder}
              disabled={reorder.isPending || !todaysTasks.data?.length}
            >
              <ArrowDownUp className="size-4" />
              {reorder.isPending ? "Reordering…" : "Reorder my list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="text-primary size-4" /> Daily summary
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {summary ? (
              <ReactMarkdown>{summary}</ReactMarkdown>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSummaryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompletedTodaySection() {
  const trpc = useTRPC();
  // Pull all completed tasks; filter to today client-side (the API doesn't
  // support a "completed today" smart filter and we don't want to pollute
  // the schema with one-off filters).
  const completed = useQuery(trpc.tasks.list.queryOptions({ smart: "completed" }));

  const today = DateTime.now().startOf("day");
  const items =
    completed.data?.filter((t) => {
      if (!t.completedAt) return false;
      return DateTime.fromJSDate(new Date(t.completedAt)).hasSame(today, "day");
    }) ?? [];

  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
        <CheckCircle2 className="size-3.5" /> Completed today · {items.length}
      </h2>
      <ul>
        {items.map((t) => (
          <li key={t.id}>
            <TaskRow task={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}
