"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ["Q"], description: "Quick add task" },
  { keys: ["⌘", "K"], description: "Open command palette" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close any open dialog" },
  { keys: ["Enter"], description: "Submit composer or rename" },
];

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (inField) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="text-primary size-4" />
              Keyboard shortcuts
            </DialogTitle>
            <DialogDescription>Move faster without your mouse.</DialogDescription>
          </DialogHeader>
          <ul className="divide-border divide-y">
            {SHORTCUTS.map((sc) => (
              <li key={sc.description} className="flex items-center justify-between py-2 text-sm">
                <span>{sc.description}</span>
                <span className="flex items-center gap-1">
                  {sc.keys.map((k, i) => (
                    <React.Fragment key={`${sc.description}-${i}`}>
                      <kbd className="bg-muted text-muted-foreground inline-block min-w-[1.75rem] rounded border px-1.5 py-0.5 text-center font-mono text-xs">
                        {k}
                      </kbd>
                      {i < sc.keys.length - 1 ? (
                        <span className="text-muted-foreground text-xs">+</span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
