import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useAppState } from "@react-native-community/hooks";

import Config from "@/config";
import { useAuth } from "./AuthContext";

const IS_REVENUE_CAT_ENABLED = !!Config.REVENUE_CAT_API_KEY;

type RevenueCatContextType = {
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  packages: PurchasesPackage[];
  restorePurchases: () => Promise<void>;
  isProMember: boolean;
  updateCustomerInfo: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const { user } = useAuth();
  const appState = useAppState();

  const isProMember = Boolean(customerInfo?.entitlements.active["Pro"]);

  const updateCustomerInfo = useCallback(async () => {
    if (!IS_REVENUE_CAT_ENABLED) return;

    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error("Error fetching customer info:", error);
    }
  }, []);

  useEffect(() => {
    if (!IS_REVENUE_CAT_ENABLED) return;

    (async () => {
      if (user && appState === "active") {
        await updateCustomerInfo();
        try {
          await Purchases.logIn(user.uid);
        } catch (error) {
          console.error("Error logging into RevenueCat:", error);
        }
      }
    })();
  }, [user, appState, updateCustomerInfo]);

  const restorePurchases = async () => {
    if (!IS_REVENUE_CAT_ENABLED) return;

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } catch (error) {
      console.error("Error restoring purchases:", error);
      throw error;
    }
  };

  // Initialize RevenueCat
  useEffect(() => {
    if (!IS_REVENUE_CAT_ENABLED) return;

    (async () => {
      try {
        const apiKey = Config.REVENUE_CAT_API_KEY;

        if (!apiKey) {
          console.warn("RevenueCat API key not set, skipping initialization");
          setIsLoading(false);
          return;
        }

        if (Platform.OS === "ios") {
          Purchases.configure({
            apiKey,
          });
        }

        // Fetch available packages
        const offerings = await Purchases.getOfferings();
        console.log("offerings", offerings);
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }

        await updateCustomerInfo();
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing RevenueCat:", error);
        setIsLoading(false);
      }
    })();
  }, [updateCustomerInfo]);

  return (
    <RevenueCatContext.Provider
      value={{
        customerInfo,
        isLoading,
        packages,
        restorePurchases,
        isProMember,
        updateCustomerInfo,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
