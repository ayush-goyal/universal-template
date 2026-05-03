"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useQuickAdd } from "./QuickAddProvider";

/**
 * Floating "Add task" button. Appears on mobile (and as a soft action on
 * desktop) — pressing "q" anywhere also opens the dialog.
 */
export function QuickAddFab() {
  const { open } = useQuickAdd();
  return (
    <Button
      onClick={open}
      size="lg"
      className="fixed right-6 bottom-6 z-30 size-12 rounded-full shadow-lg"
      aria-label="Quick add task"
    >
      <Plus className="size-5" />
    </Button>
  );
}
