import { createContext, useCallback, useContext, useMemo } from "react";

import { useRevenueCat } from "./RevenueCatContext";

type SubscriptionContextType = {
  isPro: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isProMember: isPro, isLoading, updateCustomerInfo } = useRevenueCat();

  const refreshSubscription = useCallback(async () => {
    await updateCustomerInfo();
  }, [updateCustomerInfo]);

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
