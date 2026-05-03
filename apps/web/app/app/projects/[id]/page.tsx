"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Inbox } from "lucide-react";
import { useTRPC } from "trpc/react";

import { TaskList } from "@/components/tasks/TaskList";
import { Skeleton } from "@/components/ui/skeleton";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const projectQuery = useQuery(trpc.projects.get.queryOptions({ id: params.id }));

  useEffect(() => {
    if (projectQuery.data?.isInbox) router.replace("/app/inbox");
  }, [projectQuery.data?.isInbox, router]);

  if (projectQuery.isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
        <Skeleton className="mb-3 h-7 w-48" />
        <Skeleton className="mb-6 h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const project = projectQuery.data;
  if (!project) {
    return (
      <div className="text-muted-foreground container mx-auto max-w-3xl px-4 py-10 text-center">
        Project not found.
      </div>
    );
  }

  const colors = colorClasses(project.color);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        {project.isInbox ? (
          <Inbox className="text-muted-foreground size-6" />
        ) : (
          <span className={cn("inline-block size-3.5 rounded-full", colors.dot)} />
        )}
        <FolderKanban className="text-muted-foreground size-5" />
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      </header>
      <TaskList
        filter={{ projectId: project.id }}
        composerProjectId={project.id}
        emptyState="No tasks in this project yet."
      />
    </div>
  );
}
