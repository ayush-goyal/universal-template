import type { RouterClient } from "@orpc/server";
import { createORPCClient, isDefinedError, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import type { AppRouter } from "@acme/api";

import Config from "@/config";
import { authClient } from "@/libs/auth-client";

const link = new RPCLink({
  url: () => `${Config.SITE_URL}/api/rpc`,
  headers: () => {
    const headers: Record<string, string> = {};
    const cookies = authClient.getCookie();
    if (cookies) {
      headers.Cookie = cookies;
    }
    return headers;
  },
});

const orpcClient: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(orpcClient);

export type ORPC = typeof orpc;

export function isORPCError(cause: unknown): cause is ORPCError<string, unknown> {
  return cause instanceof ORPCError;
}

export { isDefinedError };
