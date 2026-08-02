import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useTRPC } from "@/libs/trpc";

/**
 * Today's metered usage, for "3 messages left" style copy.
 *
 * Advisory only — the server enforces the same limit at the point of use — so it is fine for this
 * to be briefly stale.
 */
export function useUsage() {
  const trpc = useTRPC();
  const { user } = useAuth();

  return useQuery({
    ...trpc.getUsage.queryOptions(),
    enabled: Boolean(user),
  });
}
