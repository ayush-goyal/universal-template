"use client";

import type { ProjectColor } from "@/lib/colors";
import type { DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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

export function NavProjects() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const projectsQuery = useQuery(trpc.projects.list.queryOptions());
  const projects = projectsQuery.data ?? [];

  const deleteProject = useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Project deleted");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const reorderProjects = useMutation(
    trpc.projects.reorder.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const userProjects = projects.filter((p) => !p.isInbox);

  const [order, setOrder] = useState<string[]>(userProjects.map((p) => p.id));
  const sig = userProjects.map((p) => p.id).join("|");
  const [syncedSig, setSyncedSig] = useState(sig);
  if (syncedSig !== sig) {
    setSyncedSig(sig);
    setOrder(userProjects.map((p) => p.id));
  }
  const projectsById = new Map(userProjects.map((p) => [p.id, p]));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    reorderProjects.mutate({ orderedIds: newOrder });
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-1.5">
          <FolderKanban className="size-3.5" /> Projects
        </SidebarGroupLabel>
        <SidebarGroupAction title="Add project" onClick={() => setCreateOpen(true)}>
          <Plus />
          <span className="sr-only">Add project</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <SidebarMenu>
                {order.map((id) => {
                  const p = projectsById.get(id);
                  if (!p) return null;
                  return (
                    <SortableProjectItem
                      key={id}
                      project={p}
                      pathname={pathname}
                      onClickLink={() => setOpenMobile(false)}
                      onEdit={() => setEditingId(p.id)}
                      onDelete={() => {
                        if (window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                          deleteProject.mutate({ id: p.id });
                        }
                      }}
                    />
                  );
                })}
                {userProjects.length === 0 ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setCreateOpen(true)}
                      className="text-muted-foreground"
                    >
                      <Plus />
                      <span>Add a project</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SortableContext>
          </DndContext>
        </SidebarGroupContent>
      </SidebarGroup>

      <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" />
      <ProjectDialog
        open={!!editingId}
        onOpenChange={(o) => !o && setEditingId(null)}
        mode="edit"
        projectId={editingId}
      />
    </>
  );
}

function SortableProjectItem({
  project,
  pathname,
  onClickLink,
  onEdit,
  onDelete,
}: {
  project: { id: string; name: string; color: string };
  pathname: string;
  onClickLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const colors = colorClasses(project.color);
  const active = pathname === `/app/projects/${project.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style} className="group/item">
      <SidebarMenuButton asChild isActive={active} tooltip={project.name}>
        <Link href={`/app/projects/${project.id}`} onClick={onClickLink}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Reorder project"
            className="text-muted-foreground -ml-1 cursor-grab opacity-0 transition group-hover/item:opacity-100 active:cursor-grabbing"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="size-3" />
          </button>
          <span className={cn("inline-block size-2.5 rounded-full", colors.dot)} />
          <span className="truncate">{project.name}</span>
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
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Edit project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function ProjectDialog({
  open,
  onOpenChange,
  mode,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  projectId?: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery(trpc.projects.list.queryOptions());
  const project = projectsQuery.data?.find((p) => p.id === projectId);

  const [name, setName] = useState("");
  const [color, setColor] = useState<ProjectColor>("sage");

  // Sync local state when opening for edit.
  if (open && mode === "edit" && project && name === "" && color === "sage") {
    setName(project.name);
    setColor(project.color as ProjectColor);
  }

  const create = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Project created");
        reset();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );
  const update = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Project updated");
        reset();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message),
    })
  );

  function reset() {
    setName("");
    setColor("sage");
  }

  function submit() {
    if (!name.trim()) return;
    if (mode === "create") {
      create.mutate({ name: name.trim(), color });
    } else if (project) {
      update.mutate({ id: project.id, name: name.trim(), color });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New project" : "Edit project"}</DialogTitle>
          <DialogDescription>
            Group related tasks under a project. Pick a color to spot it quickly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              ref={(el) => {
                if (el && open) el.focus();
              }}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Home, Work, Side project…"
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
            {mode === "create" ? "Add project" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
