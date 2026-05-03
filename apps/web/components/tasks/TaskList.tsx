"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useTRPC } from "trpc/react";

import type { TaskItem } from "./TaskRow";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskComposer } from "./TaskComposer";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { TaskRow } from "./TaskRow";

interface Props {
  filter:
    | { smart: "inbox" | "today" | "upcoming" | "completed" | "all" }
    | { projectId: string; sectionId?: string | null }
    | { labelId: string };
  emptyState?: React.ReactNode;
  showComposer?: boolean;
  composerProjectId?: string | null;
  groupBy?: "none" | "day";
}

export function TaskList({
  filter,
  emptyState,
  showComposer = true,
  composerProjectId,
  groupBy = "none",
}: Props) {
  const trpc = useTRPC();

  const queryInput = React.useMemo(() => {
    if ("smart" in filter) return { smart: filter.smart };
    if ("labelId" in filter) return { labelId: filter.labelId };
    return { projectId: filter.projectId, sectionId: filter.sectionId ?? undefined };
  }, [filter]);

  const tasks = useQuery(trpc.tasks.list.queryOptions(queryInput));
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  if (tasks.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = tasks.data ?? [];

  return (
    <div className="space-y-3">
      {items.length === 0 && !showComposer ? emptyState : null}

      {groupBy === "day" ? (
        <GroupedByDay tasks={items} onOpen={setOpenTaskId} />
      ) : (
        <ul className="rounded-lg">
          {items.map((task) => (
            <li key={task.id}>
              <TaskRow task={task} onOpen={setOpenTaskId} />
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 && showComposer ? (
        <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {emptyState ?? "No tasks here yet. Add one to get started."}
        </div>
      ) : null}

      {showComposer ? <TaskComposer defaultProjectId={composerProjectId ?? null} /> : null}

      <TaskDetailDrawer taskId={openTaskId} onOpenChange={(o) => !o && setOpenTaskId(null)} />
    </div>
  );
}

function GroupedByDay({ tasks, onOpen }: { tasks: TaskItem[]; onOpen: (id: string) => void }) {
  const groups = React.useMemo(() => {
    const overdue: TaskItem[] = [];
    const byDay = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const dt = DateTime.fromJSDate(new Date(t.dueAt));
      const today = DateTime.now().startOf("day");
      if (dt < today && !t.completedAt) {
        overdue.push(t);
        continue;
      }
      const key = dt.toISODate() ?? "unknown";
      const arr = byDay.get(key) ?? [];
      arr.push(t);
      byDay.set(key, arr);
    }
    return {
      overdue,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {groups.overdue.length > 0 ? (
        <section>
          <h2 className="text-destructive mb-1 text-xs font-medium tracking-wider uppercase">
            Overdue
          </h2>
          <ul>
            {groups.overdue.map((t) => (
              <li key={t.id}>
                <TaskRow task={t} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {groups.byDay.map(([key, items]) => {
        const dt = DateTime.fromISO(key);
        const now = DateTime.now();
        let label = dt.toFormat("cccc, LLL d");
        if (dt.hasSame(now, "day")) label = `Today · ${dt.toFormat("cccc, LLL d")}`;
        else if (dt.hasSame(now.plus({ days: 1 }), "day"))
          label = `Tomorrow · ${dt.toFormat("cccc, LLL d")}`;
        return (
          <section key={key}>
            <h2 className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              {label}
            </h2>
            <ul>
              {items.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
