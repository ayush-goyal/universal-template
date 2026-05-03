"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import { useTRPC } from "trpc/react";

import { TaskList } from "@/components/tasks/TaskList";
import { Skeleton } from "@/components/ui/skeleton";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

export default function LabelPage() {
  const params = useParams<{ id: string }>();
  const trpc = useTRPC();
  const labelsQuery = useQuery(trpc.labels.list.queryOptions());
  const label = labelsQuery.data?.find((l) => l.id === params.id);

  if (labelsQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!label) {
    return (
      <div className="text-muted-foreground container mx-auto max-w-3xl px-4 py-10 text-center">
        Label not found.
      </div>
    );
  }
  const colors = colorClasses(label.color);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <Hash className={cn("size-6", colors.dot.replace("bg-", "text-"))} />
        <h1 className="text-2xl font-semibold tracking-tight">{label.name}</h1>
      </header>
      <TaskList
        filter={{ labelId: label.id }}
        showComposer={false}
        emptyState="No tasks have this label yet."
      />
    </div>
  );
}
