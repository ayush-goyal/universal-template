"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Inbox, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { colorClasses } from "@/lib/colors";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn } from "@/lib/utils";

/**
 * All-reminders inbox. Lists every upcoming reminder across the user's
 * tasks, grouped by day. Each row links into the underlying task drawer
 * via `?taskId=`.
 */
export default function RemindersPage() {
  useDocumentTitle("Reminders");
  const trpc = useTRPC();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const reminders = useQuery(trpc.reminders.list.queryOptions({ upcoming: true }));

  const remove = useMutation(
    trpc.reminders.delete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.reminders.list.queryKey() });
        toast.success("Reminder removed");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function openTask(taskId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("taskId", taskId);
    router.push(`${pathname}?${next.toString()}`);
  }

  const items = React.useMemo(() => reminders.data ?? [], [reminders.data]);

  // Group by ISO date.
  const groups = React.useMemo(() => {
    const map = new Map<string, { label: string; items: typeof items }>();
    const now = DateTime.now();
    for (const r of items) {
      const dt = DateTime.fromJSDate(new Date(r.remindAt));
      const key = dt.toISODate() ?? "unknown";
      let label = dt.toFormat("cccc, LLL d");
      if (dt.hasSame(now, "day")) label = `Today · ${dt.toFormat("cccc, LLL d")}`;
      else if (dt.hasSame(now.plus({ days: 1 }), "day"))
        label = `Tomorrow · ${dt.toFormat("cccc, LLL d")}`;
      else if (dt < now.startOf("day")) label = `Overdue · ${dt.toFormat("cccc, LLL d")}`;
      const bucket = map.get(key) ?? { label, items: [] };
      bucket.items = [...bucket.items, r];
      map.set(key, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <Bell className="text-muted-foreground size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground text-sm">
            Every upcoming alarm across your tasks. Tap a row to open the task.
          </p>
        </div>
      </header>

      {reminders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders set"
          description="Add a reminder from any task and it will land here."
          variant="plain"
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([key, group]) => (
            <section key={key}>
              <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                {group.label}
              </h2>
              <ul className="divide-border bg-card divide-y rounded-lg border">
                {group.items.map((r) => {
                  const dt = DateTime.fromJSDate(new Date(r.remindAt));
                  const project = r.task.project;
                  const cc = project ? colorClasses(project.color) : null;
                  const completed = !!r.task.completedAt;
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="text-muted-foreground w-20 shrink-0 font-mono text-xs">
                        {dt.toFormat("h:mm a")}
                      </div>
                      <button
                        type="button"
                        onClick={() => openTask(r.task.id)}
                        className="hover:text-primary min-w-0 flex-1 truncate text-left text-sm"
                      >
                        <span className={cn(completed && "text-muted-foreground line-through")}>
                          {r.task.title}
                        </span>
                      </button>
                      {project ? (
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          {project.isInbox ? (
                            <Inbox className="size-3" />
                          ) : (
                            <span className={cn("inline-block size-2 rounded-full", cc?.dot)} />
                          )}
                          {project.isInbox ? "Inbox" : project.name}
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7"
                        onClick={() => remove.mutate({ id: r.id })}
                        aria-label="Remove reminder"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
