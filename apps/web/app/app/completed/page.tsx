"use client";

import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function CompletedPage() {
  useDocumentTitle("Completed");
  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <CheckCircle2 className="text-muted-foreground size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Completed</h1>
          <p className="text-muted-foreground text-sm">Recent victories.</p>
        </div>
      </header>
      <TaskList
        filter={{ smart: "completed" }}
        showComposer={false}
        emptyState={
          <EmptyState
            icon={CheckCircle2}
            title="Nothing here yet"
            description="Complete a task to see it land here."
            variant="plain"
          />
        }
      />
    </div>
  );
}
