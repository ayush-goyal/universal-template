"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { TaskPriority } from "./PrioritySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DueDatePicker } from "./DueDatePicker";
import { LabelMultiSelect } from "./LabelMultiSelect";
import { PrioritySelect } from "./PrioritySelect";
import { ProjectSelect } from "./ProjectSelect";

interface Props {
  defaultProjectId?: string | null;
  defaultSectionId?: string | null;
  defaultDueAt?: Date | null;
  /**
   * If true the composer renders inline. If false it shows an "Add task" button
   * that expands into the inline composer.
   */
  alwaysOpen?: boolean;
  buttonLabel?: string;
}

/**
 * Inline composer used at the top of every task list and at the bottom of
 * project sections.
 */
export function TaskComposer({
  defaultProjectId,
  defaultSectionId,
  defaultDueAt = null,
  alwaysOpen = false,
  buttonLabel = "Add task",
}: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const [open, setOpen] = React.useState(alwaysOpen);
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>(4);
  const [dueAt, setDueAt] = React.useState<Date | null>(defaultDueAt);
  const [hasTime, setHasTime] = React.useState(false);
  const [labelIds, setLabelIds] = React.useState<string[]>([]);
  const [projectId, setProjectId] = React.useState<string | null | undefined>(defaultProjectId);
  const [syncedDefault, setSyncedDefault] = React.useState(defaultProjectId);
  if (syncedDefault !== defaultProjectId) {
    setSyncedDefault(defaultProjectId);
    setProjectId(defaultProjectId);
  }

  const create = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        toast.success("Task added");
        setTitle("");
        setPriority(4);
        setDueAt(defaultDueAt);
        setHasTime(false);
        setLabelIds([]);
        if (!alwaysOpen) setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function submit() {
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      projectId: projectId ?? null,
      sectionId: defaultSectionId ?? null,
      priority,
      dueAt,
      dueHasTime: hasTime,
      labelIds: labelIds.length ? labelIds : undefined,
    });
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground gap-2 px-1 hover:bg-transparent"
        onClick={() => setOpen(true)}
      >
        <Plus className="text-primary size-4" />
        <span>{buttonLabel}</span>
      </Button>
    );
  }

  return (
    <div className="border-border bg-card rounded-lg border p-3 shadow-sm">
      <Input
        ref={(el) => {
          if (el && open) el.focus();
        }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape" && !alwaysOpen) setOpen(false);
        }}
        placeholder="Task name"
        className="border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <DueDatePicker
          value={dueAt}
          hasTime={hasTime}
          onChange={(d, ht) => {
            setDueAt(d);
            setHasTime(ht);
          }}
        />
        <PrioritySelect value={priority} onChange={setPriority} size="default" />
        <LabelMultiSelect value={labelIds} onChange={setLabelIds} />
        <ProjectSelect value={projectId ?? null} onChange={(id) => setProjectId(id)} />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        {!alwaysOpen ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
        <Button size="sm" onClick={submit} disabled={!title.trim() || create.isPending}>
          Add task
        </Button>
      </div>
    </div>
  );
}
