import type { User } from "@/libs/auth-client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Purchases from "react-native-purchases";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";

import { authClient } from "@/libs/auth-client";
import { useUserSettingsStore } from "@/libs/stores/user-settings-store";

interface AuthContextType {
  user: User | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
  sendPhoneNumberOtp: (phoneNumber: string) => Promise<void>;
  confirmVerificationCode: (code: string, phoneNumber: string) => Promise<void>;
}

const initialState: AuthContextType = {
  user: null,
  isInitializing: true,
  signOut: async () => {},
  sendPhoneNumberOtp: async () => {},
  confirmVerificationCode: async () => {},
};

const AuthContext = createContext<AuthContextType>(initialState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || null;

  const posthog = usePostHog();
  const resetUserSettingsStore = useUserSettingsStore((state) => state.reset);
  const queryClient = useQueryClient();
  const clearAllStores = useCallback(() => {
    resetUserSettingsStore();
  }, [resetUserSettingsStore]);

  useEffect(() => {
    if (!isPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Ignore for auth
      setIsInitializing(false);
      if (user) {
        // Identify user in PostHog
        posthog.identify(user.id);
        console.log("Better Auth User Id:", user.id);
      }
    }
  }, [user, isPending, posthog]);

  const sendPhoneNumberOtp = useCallback(async (phoneNumber: string) => {
    const result = await authClient.phoneNumber.sendOtp({
      phoneNumber,
    });
    if (result.error) {
      console.error("Error sending OTP:", result.error.message);
      throw new Error(result.error.message);
    }
  }, []);

  const confirmVerificationCode = useCallback(async (code: string, phoneNumber: string) => {
    const result = await authClient.phoneNumber.verify({
      phoneNumber,
      code,
    });
    if (result.error) {
      console.error("Error verifying OTP:", result.error.message);
      throw new Error(result.error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
      posthog.reset();

      // Clear the react-query cache
      await queryClient.cancelQueries();
      queryClient.clear();

      // Clear all stores after successful sign out
      clearAllStores();
      try {
        await Purchases.logOut();
      } catch (error) {
        console.error("Error logging out of RevenueCat:", error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, [clearAllStores, posthog, queryClient]);

  const value = useMemo(
    () => ({
      user,
      isInitializing,
      signOut,
      sendPhoneNumberOtp,
      confirmVerificationCode,
    }),
    [user, isInitializing, signOut, sendPhoneNumberOtp, confirmVerificationCode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
