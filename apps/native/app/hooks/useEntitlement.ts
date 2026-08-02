import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Entitlement } from "@acme/shared";
import { FREE_ENTITLEMENT, getPlan } from "@acme/shared";

import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { useTRPC } from "@/libs/trpc";

export interface EntitlementState {
  entitlement: Entitlement;
  /**
   * Whether to unlock Pro features in the UI.
   *
   * The server is the authority — it is what actually gates the API — but its view of a store
   * purchase only updates when RevenueCat's webhook arrives, which can take a minute. Trusting the
   * local SDK as well means a user who just paid is not shown a paywall they already dismissed.
   */
  isPro: boolean;
  /** True while the server's answer is still loading and no local purchase says otherwise. */
  isLoading: boolean;
  planName: string;
  refresh: () => Promise<void>;
}

export function useEntitlement(): EntitlementState {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasProEntitlement, refreshCustomerInfo } = useRevenueCat();

  const query = useQuery({
    ...trpc.getEntitlement.queryOptions(),
    enabled: Boolean(user),
  });

  const entitlement = query.data ?? FREE_ENTITLEMENT;

  const refresh = useCallback(async () => {
    await refreshCustomerInfo();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.getEntitlement.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.getUsage.queryKey() }),
    ]);
  }, [queryClient, refreshCustomerInfo, trpc]);

  const isPro = entitlement.isPro || hasProEntitlement;

  return {
    entitlement,
    isPro,
    isLoading: query.isPending && Boolean(user) && !hasProEntitlement,
    planName: isPro ? getPlan("pro").name : getPlan(entitlement.plan).name,
    refresh,
  };
}
