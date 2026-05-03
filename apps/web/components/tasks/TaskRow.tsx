"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  FolderKanban,
  Inbox,
  ListTree,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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

  const move = useMutation(
    trpc.tasks.move.mutationOptions({
      // Optimistically remove the task from the current list — if it gets
      // moved to a different project the row no longer belongs here.
      onMutate: ({ projectId: targetProjectId }) =>
        snapshotAndPatch((list) =>
          targetProjectId && targetProjectId !== task.projectId
            ? list.filter((t) => t.id !== task.id)
            : list
        ),
      onError: (err, _v, ctx) => rollback(ctx, err),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: taskListKey });
        toast.success("Task moved");
      },
    })
  );

  // Live project list for the "Move to" submenu.
  const projectsQuery = useQuery(trpc.projects.list.queryOptions());
  const allProjects = projectsQuery.data ?? [];
  const inbox = allProjects.find((p) => p.isInbox);
  const userProjects = allProjects.filter((p) => !p.isInbox);

  const update = useMutation(
    trpc.tasks.update.mutationOptions({
      onMutate: ({ title }) =>
        snapshotAndPatch((list) =>
          list.map((t) => (t.id === task.id && typeof title === "string" ? { ...t, title } : t))
        ),
      onError: (err, _v, ctx) => rollback(ctx, err),
      onSuccess: () => qc.invalidateQueries({ queryKey: taskListKey }),
    })
  );

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(task.title);
  const [syncedTitle, setSyncedTitle] = React.useState(task.title);
  if (syncedTitle !== task.title) {
    setSyncedTitle(task.title);
    setDraft(task.title);
  }
  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) {
      update.mutate({ id: task.id, title: trimmed });
    } else {
      setDraft(task.title);
    }
  }

  const completed = !!task.completedAt;
  const overdue = !completed && isOverdue(task.dueAt, task.dueHasTime);
  const priorityColor = PRIORITY_COLORS[task.priority as 1 | 2 | 3 | 4];

  // Some surfaces (search) include the project inline so users can see
  // which list a row belongs to. When present, render a small chip.
  const inlineProject = (
    task as unknown as {
      project?: {
        id: string;
        name: string;
        color: string;
        isInbox: boolean;
      } | null;
    }
  ).project;
  const projectChip = inlineProject ? (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
      {inlineProject.isInbox ? (
        <Inbox className="size-3" />
      ) : (
        <span
          className={cn("inline-block size-2 rounded-full", colorClasses(inlineProject.color).dot)}
        />
      )}
      {inlineProject.isInbox ? "Inbox" : inlineProject.name}
    </span>
  ) : null;

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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editing ? (
            <Input
              ref={(el) => {
                if (el && editing) el.focus();
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => onOpen?.(task.id)}
              onDoubleClick={() => setEditing(true)}
              className={cn(
                "block min-w-0 flex-1 truncate text-left text-sm transition-colors",
                completed && "text-muted-foreground line-through"
              )}
            >
              {task.title}
            </button>
          )}
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
          {task._count?.comments && task._count.comments > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              {task._count.comments}
            </span>
          ) : null}
          {task._count?.children && task._count.children > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <ListTree className="size-3" />
              {task._count.children}
            </span>
          ) : null}
          {projectChip}
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
      </div>
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onOpen?.(task.id)}>
            <Pencil />
            Open task
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderKanban />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto">
              {inbox ? (
                <DropdownMenuItem
                  disabled={task.projectId === inbox.id}
                  onSelect={() =>
                    move.mutate({ id: task.id, projectId: inbox.id, sectionId: null })
                  }
                >
                  <Inbox />
                  Inbox
                </DropdownMenuItem>
              ) : null}
              {userProjects.length > 0 ? <DropdownMenuSeparator /> : null}
              {userProjects.map((p) => {
                const cc = colorClasses(p.color);
                return (
                  <DropdownMenuItem
                    key={p.id}
                    disabled={task.projectId === p.id}
                    onSelect={() => move.mutate({ id: task.id, projectId: p.id, sectionId: null })}
                  >
                    <span className={cn("inline-block size-2.5 rounded-full", cc.dot)} />
                    {p.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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
