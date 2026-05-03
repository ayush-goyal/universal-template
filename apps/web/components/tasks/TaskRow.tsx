"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, MessageSquare, MoreHorizontal, Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { RouterOutputs } from "@acme/api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { colorClasses, PRIORITY_COLORS } from "@/lib/colors";
import { formatDueDate, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TaskItem = RouterOutputs["tasks"]["list"][number];

interface Props {
  task: TaskItem;
  onOpen?: (id: string) => void;
}

export function TaskRow({ task, onOpen }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const taskListKey = trpc.tasks.list.queryKey();

  // Snapshot/rollback typed locally to keep tsc happy.
  type Snapshot = [readonly unknown[], TaskItem[] | undefined][];

  async function snapshotAndPatch(patch: (list: TaskItem[]) => TaskItem[]) {
    await qc.cancelQueries({ queryKey: taskListKey });
    const snapshots = qc.getQueriesData<TaskItem[]>({ queryKey: taskListKey }) as Snapshot;
    for (const [key, list] of snapshots) {
      if (!list) continue;
      qc.setQueryData<TaskItem[]>(key, patch(list));
    }
    return { snapshots };
  }
  function rollback(ctx: unknown, err: { message: string }) {
    const c = ctx as { snapshots?: Snapshot } | undefined;
    for (const [key, prev] of c?.snapshots ?? []) qc.setQueryData(key, prev);
    toast.error(err.message);
  }

  const complete = useMutation(
    trpc.tasks.complete.mutationOptions({
      onMutate: () => snapshotAndPatch((list) => list.filter((t) => t.id !== task.id)),
      onError: (err, _v, ctx) => rollback(ctx, err),
      onSuccess: () => qc.invalidateQueries({ queryKey: taskListKey }),
    })
  );

  const uncomplete = useMutation(
    trpc.tasks.uncomplete.mutationOptions({
      onMutate: () =>
        snapshotAndPatch((list) =>
          list.map((t) => (t.id === task.id ? { ...t, completedAt: null } : t))
        ),
      onError: (err, _v, ctx) => rollback(ctx, err),
      onSuccess: () => qc.invalidateQueries({ queryKey: taskListKey }),
    })
  );

  const remove = useMutation(
    trpc.tasks.delete.mutationOptions({
      onMutate: () => snapshotAndPatch((list) => list.filter((t) => t.id !== task.id)),
      onError: (err, _v, ctx) => rollback(ctx, err),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: taskListKey });
        toast.success("Task deleted");
      },
    })
  );

  const completed = !!task.completedAt;
  const overdue = !completed && isOverdue(task.dueAt, task.dueHasTime);
  const priorityColor = PRIORITY_COLORS[task.priority as 1 | 2 | 3 | 4];

  return (
    <div className="group border-border/40 hover:bg-accent/30 flex items-start gap-3 border-b px-1 py-2 transition-colors">
      <div className="pt-0.5">
        <Checkbox
          checked={completed}
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          onCheckedChange={(c) => {
            if (c) complete.mutate({ id: task.id });
            else uncomplete.mutate({ id: task.id });
          }}
          className={cn("border-2", priorityColor.dot.replace("text-", "border-"))}
        />
      </div>
      <button type="button" onClick={() => onOpen?.(task.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "block min-w-0 truncate text-sm",
              completed && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </span>
          {task.recurrence ? <Repeat className="text-muted-foreground size-3.5 shrink-0" /> : null}
        </div>
        {task.description ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{task.description}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {task.dueAt ? (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Calendar className="size-3" />
              {formatDueDate(task.dueAt, task.dueHasTime)}
            </span>
          ) : null}
          {task._count.comments > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              {task._count.comments}
            </span>
          ) : null}
          {task.taskLabels.length > 0
            ? task.taskLabels.map(({ label }) => {
                const cc = colorClasses(label.color);
                return (
                  <span
                    key={label.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      cc.bg,
                      cc.text
                    )}
                  >
                    @{label.name}
                  </span>
                );
              })
            : null}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Task actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onOpen?.(task.id)}>
            <Pencil />
            Open task
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => {
              if (window.confirm(`Delete "${task.title}"?`)) remove.mutate({ id: task.id });
            }}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
