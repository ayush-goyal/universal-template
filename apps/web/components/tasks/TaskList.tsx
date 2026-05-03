"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import * as React from "react";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import type { TaskItem } from "./TaskRow";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskComposer } from "./TaskComposer";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { TaskRow } from "./TaskRow";

interface Props {
  filter:
    | { smart: "inbox" | "today" | "upcoming" | "completed" | "all" }
    | { projectId: string; sectionId?: string | null }
    | { labelId: string };
  emptyState?: React.ReactNode;
  showComposer?: boolean;
  composerProjectId?: string | null;
  groupBy?: "none" | "day";
  /** Enable DnD reordering inside this list. */
  enableReorder?: boolean;
}

export function TaskList({
  filter,
  emptyState,
  showComposer = true,
  composerProjectId,
  groupBy = "none",
  enableReorder = false,
}: Props) {
  const trpc = useTRPC();

  const queryInput = React.useMemo(() => {
    if ("smart" in filter) return { smart: filter.smart };
    if ("labelId" in filter) return { labelId: filter.labelId };
    return { projectId: filter.projectId, sectionId: filter.sectionId ?? undefined };
  }, [filter]);

  const tasks = useQuery(trpc.tasks.list.queryOptions(queryInput));
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(null);

  if (tasks.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const items = tasks.data ?? [];

  return (
    <div className="space-y-3">
      {items.length === 0 && !showComposer ? emptyState : null}

      {groupBy === "day" ? (
        <GroupedByDay tasks={items} onOpen={setOpenTaskId} />
      ) : enableReorder ? (
        <SortableInbox tasks={items} onOpen={setOpenTaskId} />
      ) : (
        <ul className="rounded-lg">
          {items.map((task) => {
            const children = (task as unknown as { children?: TaskItem[] }).children ?? [];
            return (
              <li key={task.id}>
                <TaskRow task={task} onOpen={setOpenTaskId} />
                {children.length > 0 ? (
                  <ul className="border-border/60 ml-7 border-l pl-2">
                    {children.map((sub) => (
                      <li key={sub.id}>
                        <TaskRow task={sub} onOpen={setOpenTaskId} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {items.length === 0 && showComposer ? (
        <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {emptyState ?? "No tasks here yet. Add one to get started."}
        </div>
      ) : null}

      {showComposer ? <TaskComposer defaultProjectId={composerProjectId ?? null} /> : null}

      <TaskDetailDrawer taskId={openTaskId} onOpenChange={(o) => !o && setOpenTaskId(null)} />
    </div>
  );
}

function GroupedByDay({ tasks, onOpen }: { tasks: TaskItem[]; onOpen: (id: string) => void }) {
  const groups = React.useMemo(() => {
    const overdue: TaskItem[] = [];
    const byDay = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const dt = DateTime.fromJSDate(new Date(t.dueAt));
      const today = DateTime.now().startOf("day");
      if (dt < today && !t.completedAt) {
        overdue.push(t);
        continue;
      }
      const key = dt.toISODate() ?? "unknown";
      const arr = byDay.get(key) ?? [];
      arr.push(t);
      byDay.set(key, arr);
    }
    return {
      overdue,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {groups.overdue.length > 0 ? (
        <section>
          <h2 className="text-destructive mb-1 text-xs font-medium tracking-wider uppercase">
            Overdue
          </h2>
          <ul>
            {groups.overdue.map((t) => (
              <li key={t.id}>
                <TaskRow task={t} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {groups.byDay.map(([key, items]) => {
        const dt = DateTime.fromISO(key);
        const now = DateTime.now();
        let label = dt.toFormat("cccc, LLL d");
        if (dt.hasSame(now, "day")) label = `Today · ${dt.toFormat("cccc, LLL d")}`;
        else if (dt.hasSame(now.plus({ days: 1 }), "day"))
          label = `Tomorrow · ${dt.toFormat("cccc, LLL d")}`;
        return (
          <section key={key}>
            <h2 className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
              {label}
            </h2>
            <ul>
              {items.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function SortableInbox({ tasks, onOpen }: { tasks: TaskItem[]; onOpen: (id: string) => void }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [order, setOrder] = React.useState(tasks.map((t) => t.id));
  const sig = tasks.map((t) => t.id).join("|");
  const [syncedSig, setSyncedSig] = React.useState(sig);
  if (syncedSig !== sig) {
    setSyncedSig(sig);
    setOrder(tasks.map((t) => t.id));
  }

  const reorder = useMutation(
    trpc.tasks.reorder.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() }),
      onError: (e) => toast.error(e.message),
    })
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    reorder.mutate({ orderedIds: newOrder });
  }

  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul>
          {order.map((id) => {
            const task = tasksById.get(id);
            if (!task) return null;
            const children = (task as unknown as { children?: TaskItem[] }).children ?? [];
            return (
              <li key={id}>
                <SortableInboxRow task={task} onOpen={onOpen} />
                {children.length > 0 ? (
                  <ul className="border-border/60 ml-7 border-l pl-2">
                    {children.map((sub) => (
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

function SortableInboxRow({ task, onOpen }: { task: TaskItem; onOpen: (id: string) => void }) {
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
