"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useTRPC } from "trpc/react";

/**
 * Convenience hooks for the most common TanStack-query mutation side-effects.
 *
 * Components can call e.g. `invalidateTaskLists(qc)` after a mutation to
 * refresh every task-list view (Inbox / Today / Upcoming / project page /
 * label page) without having to enumerate them.
 *
 * Keep these in sync with the routers in `packages/api/src/routes`.
 */
export function useTaskInvalidators() {
  const trpc = useTRPC();
  return {
    /** Refetch every `tasks.list` query. */
    invalidateTaskLists: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: trpc.tasks.list.queryKey() }),

    /** Refetch the detail query for a specific task. */
    invalidateTask: (qc: QueryClient, taskId: string) =>
      qc.invalidateQueries({ queryKey: trpc.tasks.get.queryKey({ id: taskId }) }),

    /** Refetch the projects sidebar list. */
    invalidateProjects: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: trpc.projects.list.queryKey() }),

    /** Refetch the labels sidebar list. */
    invalidateLabels: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: trpc.labels.list.queryKey() }),

    /** Refetch the subscription status (used for entitlement gates). */
    invalidateSubscription: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: trpc.subscription.status.queryKey() }),
  };
}

/**
 * Refresh everything the app shell renders — projects, labels, task lists,
 * subscription status. Useful after large state changes (e.g. project
 * generation, plan switch).
 */
export function useFullAppInvalidator() {
  const helpers = useTaskInvalidators();
  return (qc: QueryClient) =>
    Promise.all([
      helpers.invalidateProjects(qc),
      helpers.invalidateLabels(qc),
      helpers.invalidateTaskLists(qc),
      helpers.invalidateSubscription(qc),
    ]);
}
