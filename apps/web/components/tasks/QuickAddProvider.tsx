"use client";

import * as React from "react";

import { QuickAddDialog } from "./QuickAddDialog";

interface QuickAddContextValue {
  open: () => void;
}

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  // Global keyboard shortcut: "q" or "+" to open quick-add (when not in input).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (inField) return;

      if ((e.key === "q" || e.key === "Q") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <QuickAddContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <QuickAddDialog open={open} onOpenChange={setOpen} />
    </QuickAddContext.Provider>
  );
}
