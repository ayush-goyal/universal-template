"use client";

import { authClient } from "@/lib/auth-client";
import { MarketingHeader } from "./MarketingHeader";

/**
 * Client-side variant that derives `isSignedIn` from the auth-client
 * session hook. Use this from `"use client"` pages where the server-side
 * `headers()` API isn't available.
 */
export function MarketingHeaderClient() {
  const { data: session } = authClient.useSession();
  return <MarketingHeader isSignedIn={!!session?.user} />;
}
