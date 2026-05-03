"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TaskDetailDrawer } from "./TaskDetailDrawer";

/**
 * Mounts a single TaskDetailDrawer at the app-shell level and binds it to
 * the `?taskId=` query string. Anywhere in the app, pushing
 * `?taskId=<id>` opens the drawer; closing it strips the param. Used by
 * the Cmd+K palette and the /app/search results to deep-link to a task.
 */
export function GlobalTaskDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  function handleOpenChange(open: boolean) {
    if (!open && taskId) {
      const next = new URLSearchParams(searchParams);
      next.delete("taskId");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

  return <TaskDetailDrawer taskId={taskId ?? null} onOpenChange={handleOpenChange} />;
}
