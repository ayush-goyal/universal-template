import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/libs/trpc";
import { useAuth } from "./AuthContext";
import { useRevenueCat } from "./RevenueCatContext";

type SubscriptionContextType = {
  isPro: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    isProMember: isRevenueCatPro,
    isLoading: isRevenueCatLoading,
    updateCustomerInfo,
  } = useRevenueCat();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: serverSubscription, isLoading: isServerLoading } = useQuery({
    ...trpc.getSubscription.queryOptions(),
    enabled: !!user,
  });

  const isServerPro = serverSubscription?.isPro ?? false;
  const isPro = isRevenueCatPro || isServerPro;
  const isLoading = isRevenueCatLoading || (!!user && isServerLoading);

  const refreshSubscription = useCallback(async () => {
    await updateCustomerInfo();
    await queryClient.invalidateQueries({ queryKey: trpc.getSubscription.queryKey() });
  }, [updateCustomerInfo, queryClient, trpc]);

  const upgradeToPro = useCallback(async () => {
    const { presentPaywall } = await import("@/libs/revenueCat");
    await presentPaywall();
    await refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo(
    () => ({
      isPro,
      isLoading,
      refreshSubscription,
      upgradeToPro,
    }),
    [isPro, isLoading, refreshSubscription, upgradeToPro]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
