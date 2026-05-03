"use client";

import { Plus } from "lucide-react";

import { useQuickAdd } from "@/components/tasks/QuickAddProvider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileTopBar() {
  const { open } = useQuickAdd();
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-12 items-center gap-2 border-b px-2 backdrop-blur md:hidden">
      <SidebarTrigger />
      <span className="ml-1 text-sm font-medium tracking-tight">Acme Tasks</span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto"
        onClick={open}
        aria-label="Quick add task"
      >
        <Plus className="size-4" />
      </Button>
    </header>
  );
}
