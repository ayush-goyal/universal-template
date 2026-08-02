import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import {
  getRevenueCatApiKey,
  isRevenueCatConfigured,
  presentPaywall as presentRevenueCatPaywall,
  PRO_ENTITLEMENT_ID,
  restorePurchases as restoreRevenueCatPurchases,
} from "@/libs/revenueCat";
import { useAuth } from "./AuthContext";

interface RevenueCatContextType {
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  packages: PurchasesPackage[];
  /**
   * What the store SDK believes on this device. The server is the authority — see
   * `useEntitlement` — but this updates the instant a purchase completes, before the webhook has
   * reached the backend.
   */
  hasProEntitlement: boolean;
  presentPaywall: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

/** Say "billing is off" once per launch rather than on every mount. */
let hasWarnedAboutMissingKey = false;

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  // Nothing to wait for when billing is not configured, so start resolved rather than making the
  // splash screen sit through a state update that will only ever say "false".
  const [isLoading, setIsLoading] = useState(() => isRevenueCatConfigured());
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const { user } = useAuth();

  const hasProEntitlement = Boolean(customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isRevenueCatConfigured()) return;

    try {
      setCustomerInfo(await Purchases.getCustomerInfo());
    } catch (error) {
      console.error("[revenuecat] could not read customer info", error);
    }
  }, []);

  // Configure exactly once per launch. Calling `configure` again resets the SDK's state, which is
  // why this deliberately does not depend on the user.
  useEffect(() => {
    const apiKey = getRevenueCatApiKey();

    if (!apiKey) {
      if (!hasWarnedAboutMissingKey) {
        hasWarnedAboutMissingKey = true;
        console.info("[revenuecat] no API key for this platform; running without billing");
      }
      return;
    }

    void (async () => {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
        Purchases.configure({ apiKey });

        const offerings = await Purchases.getOfferings();
        setPackages(offerings.current?.availablePackages ?? []);
        await refreshCustomerInfo();
      } catch (error) {
        console.error("[revenuecat] initialisation failed", error);
      } finally {
        // Always clear the flag: the splash screen waits on it, and a billing outage must not
        // leave the app stuck behind it.
        setIsLoading(false);
      }
    })();
  }, [refreshCustomerInfo]);

  // Purchases, renewals and expirations all arrive here, including ones made on another device.
  // This replaces polling on app state, which missed anything happening while the app was open.
  useEffect(() => {
    if (!isRevenueCatConfigured()) return;

    Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(setCustomerInfo);
    };
  }, []);

  // Tie store purchases to the Better Auth user id. That id is what the RevenueCat webhook sends
  // as `app_user_id`, and it is how the server matches a purchase to an account.
  useEffect(() => {
    if (!isRevenueCatConfigured() || !user) return;

    void (async () => {
      try {
        const { customerInfo: info } = await Purchases.logIn(user.id);
        setCustomerInfo(info);
      } catch (error) {
        console.error("[revenuecat] could not identify the user", error);
      }
    })();
  }, [user]);

  const presentPaywall = useCallback(async () => {
    const outcome = await presentRevenueCatPaywall();
    await refreshCustomerInfo();
    return outcome === "purchased" || outcome === "restored";
  }, [refreshCustomerInfo]);

  const restorePurchases = useCallback(async () => {
    const restored = await restoreRevenueCatPurchases();
    await refreshCustomerInfo();
    return restored;
  }, [refreshCustomerInfo]);

  const value = useMemo(
    () => ({
      customerInfo,
      isLoading,
      packages,
      hasProEntitlement,
      presentPaywall,
      restorePurchases,
      refreshCustomerInfo,
    }),
    [
      customerInfo,
      isLoading,
      packages,
      hasProEntitlement,
      presentPaywall,
      restorePurchases,
      refreshCustomerInfo,
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
