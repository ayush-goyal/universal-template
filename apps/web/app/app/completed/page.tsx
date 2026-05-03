"use client";

import { CheckCircle2 } from "lucide-react";

import { TaskList } from "@/components/tasks/TaskList";

export default function CompletedPage() {
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
        emptyState="Complete a task to see it here."
      />
    </div>
  );
}
