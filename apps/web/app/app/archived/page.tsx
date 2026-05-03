"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "trpc/react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { colorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

export default function ArchivedProjectsPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const archived = useQuery(trpc.projects.list.queryOptions({ archived: true }));

  const restore = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Project restored");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const remove = useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() });
        toast.success("Project deleted permanently");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const items = archived.data?.filter((p) => !p.isInbox) ?? [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <Archive className="text-muted-foreground size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Archived projects</h1>
          <p className="text-muted-foreground text-sm">
            Hidden from the sidebar but kept around. Restore anytime.
          </p>
        </div>
      </header>

      {archived.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No archived projects"
          description="Archive a project from the sidebar to tuck it away here."
          action={
            <Button asChild variant="outline">
              <Link href="/app/inbox">Back to Inbox</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-border bg-card divide-y rounded-lg border">
          {items.map((p) => {
            const cc = colorClasses(p.color);
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("inline-block size-2.5 rounded-full", cc.dot)} />
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => restore.mutate({ id: p.id, isArchived: false })}
                  disabled={restore.isPending}
                >
                  <ArchiveRestore className="size-4" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Permanently delete project "${p.name}"? This cannot be undone.`
                      )
                    ) {
                      remove.mutate({ id: p.id });
                    }
                  }}
                  disabled={remove.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
