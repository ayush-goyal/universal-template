"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  name: string;
  count: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function SectionHeader({ id, name, count, collapsed, onToggleCollapsed }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(name);

  // Sync draft when name changes externally.
  const [syncedName, setSyncedName] = React.useState(name);
  if (syncedName !== name) {
    setSyncedName(name);
    setDraft(name);
  }

  const update = useMutation(
    trpc.sections.update.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Section renamed");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const remove = useMutation(
    trpc.sections.delete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
        toast.success("Section deleted");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function commit() {
    if (draft.trim() && draft !== name) {
      update.mutate({ id, name: draft.trim() });
    }
    setEditing(false);
  }

  return (
    <div className="group/section border-border/60 flex items-center gap-1 border-b pb-1">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand section" : "Collapse section"}
        className="text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
      </button>
      {editing ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          ref={(el) => {
            if (el && editing) el.focus();
          }}
          className="h-7 w-64 text-sm font-medium"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="hover:text-primary text-sm font-medium"
        >
          {name}
        </button>
      )}
      <span className="text-muted-foreground ml-1 text-xs">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7 opacity-0 transition group-hover/section:opacity-100 data-[state=open]:opacity-100"
            aria-label="Section actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => {
              if (
                window.confirm(`Delete section "${name}"? Tasks will move back to the project.`)
              ) {
                remove.mutate({ id });
              }
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
