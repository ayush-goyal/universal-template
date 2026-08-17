import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases, { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { PRO_ENTITLEMENT } from "@acme/shared/billing";

import Config from "@/config";
import {
  initializeRevenueCat,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
} from "@/libs/revenueCat";
import { useAuth } from "./AuthContext";

type RevenueCatContextType = {
  canMakePurchases: boolean;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  isPro: boolean;
  packages: PurchasesPackage[];
  presentCustomerCenter: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  updateCustomerInfo: () => Promise<CustomerInfo | null>;
};

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);
const EMPTY_PACKAGES: PurchasesPackage[] = [];

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [initializedIdentity, setInitializedIdentity] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const { isInitializing: isAuthInitializing, user } = useAuth();

  const apiKey =
    Platform.OS === "ios"
      ? Config.REVENUE_CAT_IOS_API_KEY
      : Platform.OS === "android"
        ? Config.REVENUE_CAT_ANDROID_API_KEY
        : "";
  const isRevenueCatEnabled = Boolean(apiKey);
  const identity = user?.id ?? "anonymous";
  const hasInitializedCurrentIdentity = initializedIdentity === identity;
  const activeCustomerInfo = hasInitializedCurrentIdentity ? customerInfo : null;
  const activePackages = hasInitializedCurrentIdentity ? packages : EMPTY_PACKAGES;
  const isLoading = Boolean(
    !isAuthInitializing && isRevenueCatEnabled && !hasInitializedCurrentIdentity
  );
  const isPro = Boolean(activeCustomerInfo?.entitlements.active[PRO_ENTITLEMENT]);

  const updateCustomerInfo = useCallback(async () => {
    if (!isRevenueCatEnabled) return null;

    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (error) {
      console.error("Error fetching customer info:", error);
      return null;
    }
  }, [isRevenueCatEnabled]);

  const restorePurchases = useCallback(async () => {
    if (!isRevenueCatEnabled) return null;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (error) {
      console.error("Error restoring purchases:", error);
      throw error;
    }
  }, [isRevenueCatEnabled]);

  useEffect(() => {
    let cancelled = false;

    if (isAuthInitializing || !isRevenueCatEnabled) {
      return;
    }

    (async () => {
      try {
        const initialState = await initializeRevenueCat(apiKey, user?.id);
        if (!cancelled) {
          setCustomerInfo(initialState.customerInfo);
          setPackages(initialState.packages);
        }
      } catch (error) {
        console.error("Error initializing RevenueCat:", error);
      } finally {
        if (!cancelled) setInitializedIdentity(identity);
      }
    })();

    const listener = (info: CustomerInfo) => {
      if (!cancelled) setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [apiKey, identity, isAuthInitializing, isRevenueCatEnabled, user?.id]);

  const presentPaywall = useCallback(async () => {
    if (isPro) return true;
    if (!isRevenueCatEnabled) return false;

    const purchased = await presentRevenueCatPaywall();
    if (purchased) await updateCustomerInfo();
    return purchased;
  }, [isPro, isRevenueCatEnabled, updateCustomerInfo]);

  const value = useMemo<RevenueCatContextType>(
    () => ({
      canMakePurchases: isRevenueCatEnabled,
      customerInfo: activeCustomerInfo,
      isLoading,
      isPro,
      packages: activePackages,
      presentCustomerCenter: presentRevenueCatCustomerCenter,
      presentPaywall,
      restorePurchases,
      updateCustomerInfo,
    }),
    [
      activeCustomerInfo,
      activePackages,
      isRevenueCatEnabled,
      isLoading,
      isPro,
      presentPaywall,
      restorePurchases,
      updateCustomerInfo,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
