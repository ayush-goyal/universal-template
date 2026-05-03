"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string | null;
}

/**
 * Cmd/Ctrl-K style quick-add. Single input that auto-parses Todoist-style
 * markers ("#project @label p1 tomorrow 9am every monday"). When the user is
 * on Pro and AI is configured, falls back to AI parsing on submit.
 */
export function QuickAddDialog({ open, onOpenChange, defaultProjectId }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [text, setText] = React.useState("");

  const aiStatus = useQuery(trpc.ai.status.queryOptions(undefined, { enabled: open }));
  const projectsQuery = useQuery(trpc.projects.list.queryOptions(undefined, { enabled: open }));
  const labelsQuery = useQuery(trpc.labels.list.queryOptions(undefined, { enabled: open }));

  const aiParse = useMutation(trpc.ai.parseQuickAdd.mutationOptions());
  const createTask = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => {
        toast.success("Task added");
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        setText("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const aiAvailable = aiStatus.data?.enabled && aiStatus.data?.plan === "pro";

  // Wrap the onOpenChange to clear text on close (avoids setState-in-effect).
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) setText("");
      onOpenChange(next);
    },
    [onOpenChange]
  );

  async function submit() {
    if (!text.trim()) return;
    const parsed = await aiParse.mutateAsync({ text: text.trim() });

    // Resolve project / labels by name → id.
    const projectName = parsed.projectName;
    const labelNames = parsed.labelNames ?? [];

    let projectId: string | null = defaultProjectId ?? null;
    if (projectName) {
      const match = projectsQuery.data?.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
      );
      if (match) projectId = match.id;
    }

    const labelIds: string[] = [];
    for (const name of labelNames) {
      const m = labelsQuery.data?.find((l) => l.name.toLowerCase() === name.toLowerCase());
      if (m) labelIds.push(m.id);
    }

    createTask.mutate({
      title: parsed.title,
      description: parsed.description,
      projectId,
      priority: parsed.priority,
      dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
      dueHasTime: parsed.dueHasTime,
      recurrence: parsed.recurrence,
      labelIds: labelIds.length ? labelIds : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            Quick add
          </DialogTitle>
          <DialogDescription>
            Type your task naturally. Try:{" "}
            <span className="font-mono text-xs">Pay rent every 1st 9am p1 #Home @money</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            ref={(el) => {
              if (el && open) el.focus();
            }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Buy milk tomorrow 9am !p2 #Errands @home"
            className="text-base"
          />
          {aiAvailable ? (
            <p className="text-muted-foreground text-xs">
              <Sparkles className="text-primary -mt-0.5 mr-1 inline size-3" />
              AI parsing is enabled for your account.
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!text.trim() || aiParse.isPending || createTask.isPending}
          >
            Add task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
