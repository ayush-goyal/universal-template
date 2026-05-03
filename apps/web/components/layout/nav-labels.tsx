"use client";

import type { ProjectColor } from "@/lib/colors";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, MoreHorizontal, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { colorClasses, PROJECT_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

export function NavLabels() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const labelsQuery = useQuery(trpc.labels.list.queryOptions());
  const labels = labelsQuery.data ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const remove = useMutation(
    trpc.labels.delete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.labels.list.queryKey() });
        toast.success("Label deleted");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-1.5">
          <Tag className="size-3.5" /> Labels
        </SidebarGroupLabel>
        <SidebarGroupAction title="Add label" onClick={() => setCreateOpen(true)}>
          <Plus />
          <span className="sr-only">Add label</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <SidebarMenu>
            {labels.map((label) => {
              const cc = colorClasses(label.color);
              return (
                <SidebarMenuItem key={label.id} className="group/item">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/app/labels/${label.id}`}
                    tooltip={label.name}
                  >
                    <Link href={`/app/labels/${label.id}`} onClick={() => setOpenMobile(false)}>
                      <Hash className={cn("size-4", cc.dot.replace("bg-", "text-"))} />
                      <span>{label.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction>
                        <MoreHorizontal className="size-3.5" />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditingId(label.id)}>
                        <Pencil />
                        Edit label
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          if (window.confirm(`Delete label "${label.name}"?`)) {
                            remove.mutate({ id: label.id });
                          }
                        }}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            })}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setCreateOpen(true)}
                className="text-muted-foreground"
              >
                <Plus />
                <span>Add a label</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <LabelDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <LabelDialog
        open={!!editingId}
        onOpenChange={(o) => !o && setEditingId(null)}
        mode="edit"
        labelId={editingId}
      />
    </>
  );
}

function LabelDialog({
  open,
  onOpenChange,
  mode,
  labelId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  labelId?: string | null;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const labelsQuery = useQuery(trpc.labels.list.queryOptions());
  const label = labelsQuery.data?.find((l) => l.id === labelId);

  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>("sage");
  const [synced, setSynced] = useState<string | null>(null);
  const targetKey = mode === "edit" ? (labelId ?? "") : "create";
  if (synced !== (open ? targetKey : null)) {
    setSynced(open ? targetKey : null);
    if (open) {
      if (mode === "edit" && label) {
        setName(label.name);
        setColor(label.color as ProjectColor);
      } else {
        setName("");
        setColor("sage");
      }
    }
  }

  const create = useMutation(
    trpc.labels.create.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.labels.list.queryKey() });
        toast.success("Label created");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const update = useMutation(
    trpc.labels.update.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.labels.list.queryKey() });
        toast.success("Label updated");
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function submit() {
    if (!name.trim()) return;
    if (mode === "create") {
      create.mutate({ name: name.trim(), color });
    } else if (label) {
      update.mutate({ id: label.id, name: name.trim(), color });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New label" : "Edit label"}</DialogTitle>
          <DialogDescription>
            Tag tasks across projects so you can slice them later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="label-name">Name</Label>
            <Input
              id="label-name"
              value={name}
              ref={(el) => {
                if (el && open) el.focus();
              }}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="errand, urgent, deep-work…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => {
                const cc = colorClasses(c);
                const selected = c === color;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "ring-offset-background size-7 rounded-full ring-2 ring-offset-2 transition",
                      cc.dot,
                      selected ? "ring-foreground" : "ring-transparent"
                    )}
                    aria-label={c}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending || !name.trim()}>
            {mode === "create" ? "Add label" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
