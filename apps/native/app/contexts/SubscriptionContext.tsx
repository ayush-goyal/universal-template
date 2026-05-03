import { createContext, useCallback, useContext, useMemo } from "react";
import { Linking, Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Config from "@/config";
import { useTRPC } from "@/libs/trpc";
import { useAuth } from "./AuthContext";
import { useRevenueCat } from "./RevenueCatContext";

type SubscriptionContextType = {
  isPro: boolean;
  isLoading: boolean;
  currentPlan: string;
  refreshSubscription: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isProMember: isRevenueCatPro, isLoading: isRevenueCatLoading } = useRevenueCat();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading: isServerLoading } = useQuery({
    ...trpc.getSubscription.queryOptions(),
    enabled: !!user,
  });

  const isPro = isRevenueCatPro || (subscriptionData?.isPro ?? false);
  const isLoading = isRevenueCatLoading || (!!user && isServerLoading);
  const currentPlan = subscriptionData?.activePlan ?? "free";

  const refreshSubscription = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.getSubscription.queryKey() });
  }, [queryClient, trpc]);

  const upgradeToPro = useCallback(async () => {
    if (Platform.OS === "web" || !Config.REVENUE_CAT_API_KEY) {
      const url = `${Config.SITE_URL}/pricing`;
      await Linking.openURL(url);
    } else {
      const { presentPaywall } = await import("@/libs/revenueCat");
      await presentPaywall();
      await refreshSubscription();
    }
  }, [refreshSubscription]);

  const value = useMemo(
    () => ({
      isPro,
      isLoading,
      currentPlan,
      refreshSubscription,
      upgradeToPro,
    }),
    [isPro, isLoading, currentPlan, refreshSubscription, upgradeToPro]
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
