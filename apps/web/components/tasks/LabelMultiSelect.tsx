"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  size?: "sm" | "default";
}

export function LabelMultiSelect({ value, onChange, size = "sm" }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const labels = useQuery(trpc.labels.list.queryOptions());

  const create = useMutation(
    trpc.labels.create.mutationOptions({
      onSuccess: (label) => {
        void qc.invalidateQueries({ queryKey: trpc.labels.list.queryKey() });
        onChange([...value, label.id]);
        setSearch("");
        toast.success("Label created");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const filtered = labels.data?.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));

  const selectedLabels = labels.data?.filter((l) => value.includes(l.id)) ?? [];

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          className={cn("text-muted-foreground gap-1.5", value.length > 0 && "text-foreground")}
        >
          <Tag className="size-4" />
          {selectedLabels.length === 0 ? (
            <span>Labels</span>
          ) : selectedLabels.length === 1 ? (
            <span>{selectedLabels[0]?.name}</span>
          ) : (
            <span>{selectedLabels.length} labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search or create…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <Separator />
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered?.map((l) => {
            const cc = colorClasses(l.color);
            const selected = value.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l.id)}
                className={cn(
                  "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  selected && "bg-accent"
                )}
              >
                <Hash className={cn("size-4", cc.dot.replace("bg-", "text-"))} />
                <span className="flex-1 text-left">{l.name}</span>
                {selected ? <span className="text-muted-foreground text-xs">✓</span> : null}
              </button>
            );
          })}
          {search && !filtered?.find((l) => l.name.toLowerCase() === search.toLowerCase()) ? (
            <button
              type="button"
              onClick={() => create.mutate({ name: search.trim() })}
              className="text-primary hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Plus className="size-4" />
              <span>Create "{search}"</span>
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
