import "server-only";

import { env } from "@/env";

/** Call an internal Hono route from a server-side, already authorized handler. */
export async function callHonoInternal(path: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = env.HONO_INTERNAL_URL;
  const serviceToken = env.HONO_SERVICE_TOKEN;
  if (!baseUrl || !serviceToken) {
    throw new Error("Hono internal service is not configured");
  }

  const base = new URL(baseUrl);
  const url = new URL(path, base);
  if (!path.startsWith("/internal/") || url.origin !== base.origin) {
    throw new Error("Only internal Hono routes can use the service credential");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${serviceToken}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "error",
  });
}
