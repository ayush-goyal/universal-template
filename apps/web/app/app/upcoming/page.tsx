"use client";

import { CalendarRange } from "lucide-react";

import { EmptyState } from "@/components/tasks/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function UpcomingPage() {
  useDocumentTitle("Upcoming");
  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <CalendarRange className="text-muted-foreground size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upcoming</h1>
          <p className="text-muted-foreground text-sm">Everything scheduled for the next 7 days.</p>
        </div>
      </header>
      <TaskList
        filter={{ smart: "upcoming" }}
        groupBy="day"
        emptyState={
          <EmptyState
            icon={CalendarRange}
            title="Nothing on the horizon"
            description="No tasks due in the next 30 days."
            variant="plain"
          />
        }
      />
    </div>
  );
}
