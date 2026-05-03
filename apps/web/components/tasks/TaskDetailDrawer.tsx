"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Repeat, Send, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { RouterOutputs } from "@acme/api";

import type { TaskPriority } from "./PrioritySelect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { DueDatePicker } from "./DueDatePicker";
import { LabelMultiSelect } from "./LabelMultiSelect";
import { PrioritySelect } from "./PrioritySelect";
import { ProjectSelect } from "./ProjectSelect";

interface Props {
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDrawer({ taskId, onOpenChange }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const taskQuery = useQuery(
    trpc.tasks.get.queryOptions({ id: taskId ?? "" }, { enabled: !!taskId })
  );

  const update = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const complete = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
    })
  );
  const uncomplete = useMutation(
    trpc.tasks.uncomplete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
    })
  );

  const remove = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        toast.success("Task deleted");
        onOpenChange(false);
      },
    })
  );

  const addComment = useMutation(
    trpc.comments.create.mutationOptions({
      onSuccess: () => {
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const addReminder = useMutation(
    trpc.reminders.create.mutationOptions({
      onSuccess: () => {
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
        toast.success("Reminder added");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const removeReminder = useMutation(
    trpc.reminders.delete.mutationOptions({
      onSuccess: () => {
        if (taskId)
          void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
    })
  );

  const task = taskQuery.data;

  // Local state for fields, synced from server using the React 19
  // "compare prop in state" pattern.
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [syncedTaskId, setSyncedTaskId] = React.useState<string | null>(null);
  if (task && syncedTaskId !== task.id) {
    setSyncedTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
  }

  function commitTitle() {
    if (!task) return;
    if (title.trim() && title !== task.title) {
      update.mutate({ id: task.id, title: title.trim() });
    } else if (!title.trim()) {
      setTitle(task.title);
    }
  }

  function commitDescription() {
    if (!task) return;
    if (description !== (task.description ?? "")) {
      update.mutate({ id: task.id, description: description || null });
    }
  }

  return (
    <Sheet open={!!taskId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="sr-only">Task</SheetTitle>
          <SheetDescription className="sr-only">
            Edit task details, add comments, or set reminders.
          </SheetDescription>
        </SheetHeader>

        {!task ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={!!task.completedAt}
                className="mt-1"
                onCheckedChange={(c) => {
                  if (c) complete.mutate({ id: task.id });
                  else uncomplete.mutate({ id: task.id });
                }}
                aria-label="Toggle complete"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="h-auto border-0 bg-transparent p-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <DueDatePicker
                value={task.dueAt ?? null}
                hasTime={task.dueHasTime}
                onChange={(d, ht) => update.mutate({ id: task.id, dueAt: d, dueHasTime: ht })}
                size="default"
              />
              <PrioritySelect
                value={task.priority as TaskPriority}
                size="default"
                onChange={(p) => update.mutate({ id: task.id, priority: p })}
              />
              <ProjectSelect
                value={task.projectId ?? null}
                size="default"
                onChange={(id) => update.mutate({ id: task.id, projectId: id })}
              />
              <LabelMultiSelect
                value={task.taskLabels.map((tl) => tl.label.id)}
                size="default"
                onChange={(ids) => update.mutate({ id: task.id, labelIds: ids })}
              />
            </div>

            <Textarea
              value={description}
              placeholder="Description"
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              className="min-h-32"
            />

            {task.recurrence ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Repeat className="size-4" />
                Repeats <span className="font-mono">{task.recurrence}</span>
              </div>
            ) : null}

            <Separator />

            <SubtasksSection taskId={task.id} projectId={task.projectId} subtasks={task.children} />

            <Separator />

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Bell className="size-4" /> Reminders
              </h3>
              <ul className="space-y-1.5">
                {task.reminders.map((r) => (
                  <li
                    key={r.id}
                    className="border-border flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                  >
                    <span>
                      {DateTime.fromJSDate(new Date(r.remindAt)).toLocaleString(
                        DateTime.DATETIME_MED
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => removeReminder.mutate({ id: r.id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
                {task.dueAt ? (
                  <li>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        addReminder.mutate({
                          taskId: task.id,
                          remindAt: new Date(task.dueAt!),
                        })
                      }
                    >
                      Remind me at due time
                    </Button>
                  </li>
                ) : null}
              </ul>
            </section>

            <Separator />

            <section>
              <h3 className="mb-2 text-sm font-medium">Comments</h3>
              <div className="space-y-3">
                {task.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="size-7">
                      <AvatarImage src={c.user.image ?? undefined} />
                      <AvatarFallback>{c.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted flex-1 rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{c.user.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {DateTime.fromJSDate(new Date(c.createdAt)).toRelative()}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment…"
                    className="min-h-12"
                  />
                  <Button
                    size="icon"
                    disabled={!comment.trim() || addComment.isPending}
                    onClick={() => {
                      addComment.mutate({ taskId: task.id, content: comment.trim() });
                      setComment("");
                    }}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Created {DateTime.fromJSDate(new Date(task.createdAt)).toRelative()}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm("Delete this task?")) remove.mutate({ id: task.id });
                }}
              >
                <Trash2 className="size-4" /> Delete task
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

void cn;
void colorClasses;

type SubtaskItem = NonNullable<RouterOutputs["tasks"]["get"]>["children"][number];

function SubtasksSection({
  taskId,
  projectId,
  subtasks,
}: {
  taskId: string;
  projectId: string | null;
  subtasks: SubtaskItem[];
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState("");

  const create = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
        setTitle("");
        setAdding(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const complete = useMutation(
    trpc.tasks.complete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        void qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) });
      },
    })
  );

  function submit() {
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      parentTaskId: taskId,
      projectId,
    });
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Subtasks</h3>
      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li
            key={s.id}
            className="hover:bg-accent/40 flex items-center gap-2 rounded-md px-1 py-1.5"
          >
            <Checkbox
              checked={!!s.completedAt}
              onCheckedChange={() => complete.mutate({ id: s.id })}
              aria-label="Complete subtask"
            />
            <span
              className={s.completedAt ? "text-muted-foreground text-sm line-through" : "text-sm"}
            >
              {s.title}
            </span>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            ref={(el) => {
              if (el && adding) el.focus();
            }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setTitle("");
                setAdding(false);
              }
            }}
            placeholder="Subtask"
            className="h-8"
          />
          <Button size="sm" onClick={submit} disabled={!title.trim()}>
            Add
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-1 -ml-2"
          onClick={() => setAdding(true)}
        >
          + Add subtask
        </Button>
      )}
    </section>
  );
}
