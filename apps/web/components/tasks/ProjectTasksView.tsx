"use client";

import type { TaskItem } from "@/components/tasks/TaskRow";
import type { DragEndEvent } from "@dnd-kit/core";
import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { RouterOutputs } from "@acme/api";

import { AddSectionButton } from "@/components/tasks/AddSectionButton";
import { ProjectBoard } from "@/components/tasks/ProjectBoard";
import { SectionHeader } from "@/components/tasks/SectionHeader";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ProjectWithSections = NonNullable<RouterOutputs["projects"]["get"]>;

interface Props {
  project: ProjectWithSections;
}

/**
 * Full project view: sections, drag-and-drop reordering of tasks within each
 * section, inline composers per section, plus a list/board view toggle.
 */
export function ProjectTasksView({ project }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [view, setView] = React.useState<"LIST" | "BOARD">(project.viewType);

  // Sync local view state when project view-type changes server-side.
  const [syncedView, setSyncedView] = React.useState(project.viewType);
  if (syncedView !== project.viewType) {
    setSyncedView(project.viewType);
    setView(project.viewType);
  }

  const tasksQuery = useQuery(trpc.tasks.list.queryOptions({ projectId: project.id }));

  const updateView = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
      },
    })
  );

  function setViewType(v: "LIST" | "BOARD") {
    setView(v);
    updateView.mutate({ id: project.id, viewType: v });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="sr-only">Tasks</h2>
        <ViewToggle value={view} onChange={setViewType} />
      </div>

      {tasksQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : view === "BOARD" ? (
        <ProjectBoard project={project} tasks={tasksQuery.data ?? []} />
      ) : (
        <ListView project={project} tasks={tasksQuery.data ?? []} />
      )}
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: "LIST" | "BOARD";
  onChange: (v: "LIST" | "BOARD") => void;
}) {
  return (
    <div className="bg-card inline-flex rounded-md border p-0.5 text-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("LIST")}
        className={cn("h-7 gap-1.5 px-2", value === "LIST" && "bg-accent")}
      >
        <List className="size-4" /> List
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange("BOARD")}
        className={cn("h-7 gap-1.5 px-2", value === "BOARD" && "bg-accent")}
      >
        <LayoutGrid className="size-4" /> Board
      </Button>
    </div>
  );
}

function ListView({ project, tasks }: { project: ProjectWithSections; tasks: TaskItem[] }) {
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  // The API returns top-level tasks (parentTaskId === null) with their
  // immediate children inlined under `.children`. We hydrate the children
  // map from either source so this view works regardless of mode.
  const topLevel = React.useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  const childrenByParent = React.useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const inlined = (t as unknown as { children?: TaskItem[] }).children;
      if (inlined && inlined.length) {
        m.set(t.id, inlined);
      } else if (t.parentTaskId) {
        const arr = m.get(t.parentTaskId) ?? [];
        arr.push(t);
        m.set(t.parentTaskId, arr);
      }
    }
    return m;
  }, [tasks]);

  const noSection = topLevel.filter((t) => !t.sectionId);

  return (
    <div className="space-y-6">
      <SortableTaskGroup
        projectId={project.id}
        sectionId={null}
        tasks={noSection}
        childrenByParent={childrenByParent}
        onOpen={setOpenTaskId}
      />
      <TaskComposer defaultProjectId={project.id} />

      {project.sections.map((section) => {
        const sectionTasks = topLevel.filter((t) => t.sectionId === section.id);
        const isCollapsed = collapsed[section.id];
        return (
          <section key={section.id} className="space-y-2">
            <SectionHeader
              id={section.id}
              name={section.name}
              count={sectionTasks.length}
              collapsed={!!isCollapsed}
              onToggleCollapsed={() =>
                setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))
              }
            />
            {!isCollapsed ? (
              <>
                <SortableTaskGroup
                  projectId={project.id}
                  sectionId={section.id}
                  tasks={sectionTasks}
                  childrenByParent={childrenByParent}
                  onOpen={setOpenTaskId}
                />
                <TaskComposer
                  defaultProjectId={project.id}
                  defaultSectionId={section.id}
                  buttonLabel="Add task"
                />
              </>
            ) : null}
          </section>
        );
      })}

      <AddSectionButton projectId={project.id} />

      <TaskDetailDrawer taskId={openTaskId} onOpenChange={(o) => !o && setOpenTaskId(null)} />
    </div>
  );
}

function SortableTaskGroup({
  projectId,
  sectionId,
  tasks,
  childrenByParent,
  onOpen,
}: {
  projectId: string;
  sectionId: string | null;
  tasks: TaskItem[];
  childrenByParent: Map<string, TaskItem[]>;
  onOpen: (id: string) => void;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const [order, setOrder] = React.useState(tasks.map((t) => t.id));
  // Re-sync when the task list identity changes (length or ids).
  const sig = tasks.map((t) => t.id).join("|");
  const [syncedSig, setSyncedSig] = React.useState(sig);
  if (syncedSig !== sig) {
    setSyncedSig(sig);
    setOrder(tasks.map((t) => t.id));
  }

  const reorder = useMutation(
    trpc.tasks.reorder.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    reorder.mutate({
      orderedIds: newOrder,
      projectId,
      sectionId,
    });
  }

  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul>
          {order.map((id) => {
            const task = tasksById.get(id);
            if (!task) return null;
            const subs = childrenByParent.get(id) ?? [];
            return (
              <li key={id}>
                <SortableTaskRow task={task} onOpen={onOpen} />
                {subs.length > 0 ? (
                  <ul className="border-border/60 ml-7 border-l pl-2">
                    {subs.map((sub) => (
                      <li key={sub.id}>
                        <TaskRow task={sub} onOpen={onOpen} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskRow({ task, onOpen }: { task: TaskItem; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/dnd flex items-start">
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Reorder task"
        className="text-muted-foreground mt-2 ml-1 cursor-grab opacity-0 transition group-hover/dnd:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskRow task={task} onOpen={onOpen} />
      </div>
    </div>
  );
}
