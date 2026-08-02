import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { PLANS } from "@acme/shared";

import Config from "@/config";

/**
 * The RevenueCat entitlement that grants Pro, taken from the shared plan catalog rather than
 * written out here. It must match the entitlement identifier configured in the RevenueCat
 * dashboard exactly — the comparison is case-sensitive.
 */
export const PRO_ENTITLEMENT_ID = PLANS.pro.revenueCatEntitlement ?? "pro";

/** The store SDK key for the current platform, or `undefined` when billing is not configured. */
export function getRevenueCatApiKey(): string | undefined {
  const key = Platform.select({
    ios: Config.REVENUE_CAT_IOS_API_KEY,
    android: Config.REVENUE_CAT_ANDROID_API_KEY,
    default: "",
  });
  return key ? key : undefined;
}

export function isRevenueCatConfigured(): boolean {
  return getRevenueCatApiKey() !== undefined;
}

export type PaywallOutcome = "purchased" | "restored" | "cancelled" | "not_presented" | "error";

/**
 * Show the RevenueCat paywall unless the user already has Pro.
 *
 * Returns the raw outcome rather than a boolean so callers can tell "already subscribed" apart from
 * "declined" — the two want different follow-up UI.
 */
export async function presentPaywall(): Promise<PaywallOutcome> {
  if (!isRevenueCatConfigured()) return "not_presented";

  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
    });

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        return "purchased";
      case PAYWALL_RESULT.RESTORED:
        return "restored";
      case PAYWALL_RESULT.CANCELLED:
        return "cancelled";
      case PAYWALL_RESULT.NOT_PRESENTED:
        return "not_presented";
      default:
        return "error";
    }
  } catch (error) {
    console.error("[revenuecat] failed to present the paywall", error);
    return "error";
  }
}

/**
 * Re-apply purchases the user already owns to this install.
 *
 * Apple requires a visible way to do this, and it is the fix for the common "I paid but the app
 * says free" report after reinstalling or switching devices.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isRevenueCatConfigured()) return false;

  const customerInfo = await Purchases.restorePurchases();
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
}
