"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";

export default function InboxPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <Inbox className="text-muted-foreground size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground text-sm">
            Anything you capture without a project lands here.
          </p>
        </div>
      </header>
      <TaskList
        filter={{ smart: "inbox" }}
        emptyState={
          <EmptyState
            icon={Inbox}
            title="Your inbox is empty"
            description="Anything you capture without a project lands here. Press Q to add your first task."
            variant="plain"
          />
        }
      />
    </div>
  );
}
