import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { appRouter } from "@acme/api";

import { createQueryClient } from "./query-client";

/**
 * Build the per-request initial context for an oRPC server-side caller. This mirrors what the
 * `RPCHandler` would inject for an HTTP request, but is invoked in-process from React Server
 * Components — no fetch round-trip required.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-orpc-source", "rsc");
  return { headers: heads };
});

const getQueryClient = cache(createQueryClient);

/**
 * Server-side oRPC TanStack Query utilities. Use `orpc.<procedure>.queryOptions(...)` /
 * `mutationOptions(...)` from React Server Components to prefetch data into the shared query
 * client.
 */
export const orpc = createTanstackQueryUtils(
  createRouterClient(appRouter, {
    context: createContext,
  })
);

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
}

type AnyQueryOptions = {
  queryKey: readonly unknown[];
};

export function prefetch<T extends AnyQueryOptions>(queryOptions: T) {
  const queryClient = getQueryClient();
  const meta = queryOptions.queryKey[1] as { type?: string } | undefined;
  if (meta?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as never);
  } else {
    void queryClient.prefetchQuery(queryOptions as never);
  }
}
