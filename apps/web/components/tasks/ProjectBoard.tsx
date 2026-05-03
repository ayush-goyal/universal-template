"use client";

import type { TaskItem } from "@/components/tasks/TaskRow";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import * as React from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { RouterOutputs } from "@acme/api";

import { AddSectionButton } from "@/components/tasks/AddSectionButton";
import { SectionHeader } from "@/components/tasks/SectionHeader";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ProjectWithSections = NonNullable<RouterOutputs["projects"]["get"]>;

interface Props {
  project: ProjectWithSections;
  tasks: TaskItem[];
}

const NO_SECTION = "__none__";

export function ProjectBoard({ project, tasks }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const move = useMutation(
    trpc.tasks.move.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() }),
      onError: (e) => toast.error(e.message),
    })
  );
  const reorder = useMutation(
    trpc.tasks.reorder.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() }),
      onError: (e) => toast.error(e.message),
    })
  );

  const topLevel = React.useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  const columns = React.useMemo(() => {
    const cols: { id: string; sectionId: string | null; name: string; tasks: TaskItem[] }[] = [
      {
        id: NO_SECTION,
        sectionId: null,
        name: "No section",
        tasks: topLevel.filter((t) => !t.sectionId),
      },
      ...project.sections.map((s) => ({
        id: s.id,
        sectionId: s.id,
        name: s.name,
        tasks: topLevel.filter((t) => t.sectionId === s.id),
      })),
    ];
    return cols;
  }, [topLevel, project.sections]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function findColumnOf(taskId: string): { id: string; sectionId: string | null } | null {
    for (const c of columns) {
      if (c.tasks.find((t) => t.id === taskId)) {
        return { id: c.id, sectionId: c.sectionId };
      }
    }
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeIdStr === overId) return;

    const sourceCol = findColumnOf(activeIdStr);
    if (!sourceCol) return;

    // Drop target may be a column id (NO_SECTION or section id) or another task id.
    let destSectionId: string | null = null;
    let isColumnDrop = false;
    if (overId === NO_SECTION) {
      destSectionId = null;
      isColumnDrop = true;
    } else {
      const destCol = columns.find((c) => c.id === overId);
      if (destCol) {
        destSectionId = destCol.sectionId;
        isColumnDrop = true;
      } else {
        const overCol = findColumnOf(overId);
        if (overCol) destSectionId = overCol.sectionId;
      }
    }

    if (sourceCol.sectionId !== destSectionId) {
      // Move across columns.
      move.mutate({ id: activeIdStr, projectId: project.id, sectionId: destSectionId });
      return;
    }

    if (!isColumnDrop) {
      // Reorder within same column.
      const col = columns.find((c) => c.id === sourceCol.id);
      if (!col) return;
      const ids = col.tasks.map((t) => t.id);
      const oldIdx = ids.indexOf(activeIdStr);
      const newIdx = ids.indexOf(overId);
      if (oldIdx < 0 || newIdx < 0) return;
      const newOrder = arrayMove(ids, oldIdx, newIdx);
      reorder.mutate({
        orderedIds: newOrder,
        projectId: project.id,
        sectionId: sourceCol.sectionId,
      });
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4">
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                id={col.id}
                sectionId={col.sectionId}
                name={col.name}
                tasks={col.tasks}
                projectId={project.id}
                onOpen={setOpenTaskId}
                isOnlyNoSection={col.id === NO_SECTION && project.sections.length === 0}
              />
            ))}
            <div className="w-72 shrink-0">
              <AddSectionButton projectId={project.id} />
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DragOverlay>
          {activeTask ? (
            <div className="bg-card rounded-lg border p-2 shadow-lg">
              <TaskRow task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailDrawer taskId={openTaskId} onOpenChange={(o) => !o && setOpenTaskId(null)} />
    </>
  );
}

function BoardColumn({
  id,
  sectionId,
  name,
  tasks,
  projectId,
  onOpen,
  isOnlyNoSection,
}: {
  id: string;
  sectionId: string | null;
  name: string;
  tasks: TaskItem[];
  projectId: string;
  onOpen: (id: string) => void;
  isOnlyNoSection: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 w-72 shrink-0 rounded-lg p-2 transition-colors",
        isOver && "bg-accent/40"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 px-1">
        {sectionId ? (
          <SectionHeader
            id={sectionId}
            name={name}
            count={tasks.length}
            collapsed={false}
            onToggleCollapsed={() => undefined}
          />
        ) : (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Inbox className="text-muted-foreground size-4" />
            {isOnlyNoSection ? "Tasks" : name}
            <span className="text-muted-foreground ml-1 text-xs">{tasks.length}</span>
          </div>
        )}
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0">
          {tasks.map((t) => (
            <li key={t.id}>
              <BoardCard task={t} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </SortableContext>
      <div className="mt-1">
        <TaskComposer
          defaultProjectId={projectId}
          defaultSectionId={sectionId}
          buttonLabel="Add task"
        />
      </div>
    </div>
  );
}

function BoardCard({ task, onOpen }: { task: TaskItem; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background rounded-md"
      {...attributes}
      {...listeners}
    >
      <TaskRow task={task} onOpen={onOpen} />
    </div>
  );
}
