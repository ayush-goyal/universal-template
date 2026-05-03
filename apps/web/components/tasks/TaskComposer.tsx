"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { TaskPriority } from "./PrioritySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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

  // AI quick-add toggle (Pro only). When enabled, the title input is parsed
  // by ai.parseQuickAdd before being persisted, letting users dictate
  // metadata in natural language ("Buy milk tomorrow 9am !p2 #Errands").
  const aiStatus = useQuery(trpc.ai.status.queryOptions(undefined, { enabled: open }));
  const aiAvailable = !!aiStatus.data?.enabled && aiStatus.data?.plan === "pro";
  const projectsList = useQuery(
    trpc.projects.list.queryOptions(undefined, { enabled: open && aiAvailable })
  );
  const labelsList = useQuery(
    trpc.labels.list.queryOptions(undefined, { enabled: open && aiAvailable })
  );
  const [aiMode, setAiMode] = React.useState(false);
  const aiParse = useMutation(trpc.ai.parseQuickAdd.mutationOptions());

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

  async function submit() {
    if (!title.trim()) return;

    // AI mode (Pro): parse the input first, then merge AI-derived fields
    // with whatever the user explicitly set in the form chips.
    if (aiMode && aiAvailable) {
      try {
        const parsed = await aiParse.mutateAsync({ text: title.trim() });

        let resolvedProject = projectId ?? null;
        if (parsed.projectName && projectsList.data) {
          const m = projectsList.data.find(
            (p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase()
          );
          if (m) resolvedProject = m.id;
        }
        const resolvedLabelIds: string[] = [...labelIds];
        for (const name of parsed.labelNames ?? []) {
          const m = labelsList.data?.find((l) => l.name.toLowerCase() === name.toLowerCase());
          if (m && !resolvedLabelIds.includes(m.id)) resolvedLabelIds.push(m.id);
        }

        create.mutate({
          title: parsed.title || title.trim(),
          description: parsed.description,
          projectId: resolvedProject,
          sectionId: defaultSectionId ?? null,
          priority: parsed.priority ?? priority,
          dueAt: parsed.dueAt ? new Date(parsed.dueAt) : dueAt,
          dueHasTime: parsed.dueHasTime ?? hasTime,
          recurrence: parsed.recurrence,
          labelIds: resolvedLabelIds.length ? resolvedLabelIds : undefined,
        });
        return;
      } catch (e) {
        const message = e instanceof Error ? e.message : "AI parsing failed";
        toast.error(message);
        return;
      }
    }

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
      <div className="mt-2 flex items-center justify-between gap-2">
        {aiAvailable ? (
          <button
            type="button"
            onClick={() => setAiMode((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              aiMode ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={aiMode}
          >
            <Sparkles className="size-3.5" />
            AI parse
            <Switch
              checked={aiMode}
              onCheckedChange={setAiMode}
              aria-label="Toggle AI quick-add parsing"
              className="ml-1 scale-90"
            />
          </button>
        ) : (
          <span className="sr-only">
            <Label>AI parse unavailable</Label>
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {!alwaysOpen ? (
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={!title.trim() || create.isPending || aiParse.isPending}
          >
            {aiParse.isPending ? "Parsing…" : "Add task"}
          </Button>
        </div>
      </div>
    </div>
  );
}
