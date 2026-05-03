"use client";

import type { RouterClient } from "@orpc/server";
import type { QueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { env } from "env";

import type { AppRouter } from "@acme/api";

import { createQueryClient } from "./query-client";

type ORPCUtils = ReturnType<typeof createTanstackQueryUtils<RouterClient<AppRouter>>>;

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

const createORPCRouterClient = (): RouterClient<AppRouter> => {
  const link = new RPCLink({
    url: () => `${getBaseUrl()}/api/rpc`,
    headers: () => ({ "x-orpc-source": "nextjs-react" }),
    fetch: (request, init) =>
      globalThis.fetch(request, {
        ...init,
        // Always include cookies so Better Auth can read the session.
        credentials: "include",
      }),
    interceptors: [
      onError((error) => {
        if (env.NODE_ENV === "development") {
          console.error("[oRPC client]", error);
        }
      }),
    ],
  });

  return createORPCClient(link);
};

const ORPCReactContext = createContext<ORPCUtils | null>(null);

export function useORPC(): ORPCUtils {
  const value = useContext(ORPCReactContext);
  if (!value) {
    throw new Error("useORPC must be used within an ORPCReactProvider");
  }
  return value;
}

export function ORPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [orpc] = useState<ORPCUtils>(() =>
    createTanstackQueryUtils<RouterClient<AppRouter>>(createORPCRouterClient())
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ORPCReactContext.Provider value={orpc}>{props.children}</ORPCReactContext.Provider>
    </QueryClientProvider>
  );
}
