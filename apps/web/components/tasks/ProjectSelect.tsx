"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Inbox } from "lucide-react";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  size?: "sm" | "default";
}

export function ProjectSelect({ value, onChange, size = "sm" }: Props) {
  const trpc = useTRPC();
  const [open, setOpen] = React.useState(false);
  const projectsQuery = useQuery(trpc.projects.list.queryOptions());
  const projects = projectsQuery.data ?? [];
  const inbox = projects.find((p) => p.isInbox);
  const userProjects = projects.filter((p) => !p.isInbox);
  const selected = projects.find((p) => p.id === value) ?? inbox;
  const cc = colorClasses(selected?.color);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          className={cn("text-muted-foreground gap-1.5", selected && "text-foreground")}
        >
          {selected?.isInbox ? (
            <Inbox className="size-4" />
          ) : (
            <span className={cn("inline-block size-2.5 rounded-full", cc.dot)} />
          )}
          <span>{selected?.name ?? "Inbox"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {inbox ? (
          <button
            type="button"
            onClick={() => {
              onChange(inbox.id);
              setOpen(false);
            }}
            className={cn(
              "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
              value === inbox.id && "bg-accent"
            )}
          >
            <Inbox className="size-4" />
            <span>Inbox</span>
          </button>
        ) : null}
        {userProjects.length > 0 ? <hr className="border-border my-1" /> : null}
        {userProjects.map((p) => {
          const colors = colorClasses(p.color);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                value === p.id && "bg-accent"
              )}
            >
              <FolderKanban className={cn("size-4", colors.dot.replace("bg-", "text-"))} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
