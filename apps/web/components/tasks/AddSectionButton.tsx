"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  projectId: string;
}

export function AddSectionButton({ projectId }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  const create = useMutation(
    trpc.sections.create.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Section added");
        setName("");
        setOpen(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function submit() {
    if (!name.trim()) return;
    create.mutate({ projectId, name: name.trim() });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/sect hover:text-muted-foreground flex w-full items-center justify-center gap-2 py-3 text-sm text-transparent transition-colors"
      >
        <span className="bg-border h-px flex-1" />
        <span className="inline-flex items-center gap-1 px-2">
          <Plus className="size-3.5" />
          Add section
        </span>
        <span className="bg-border h-px flex-1" />
      </button>
    );
  }

  return (
    <div className="my-3 flex items-center gap-2">
      <Input
        ref={(el) => {
          if (el && open) el.focus();
        }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
        placeholder="Section name"
        className="h-9"
      />
      <Button size="sm" onClick={submit} disabled={!name.trim() || create.isPending}>
        Add
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setName("");
          setOpen(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
