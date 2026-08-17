import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

let configured = false;
let activeUserId: string | null = null;

export async function initializeRevenueCat(apiKey: string, userId?: string) {
  if (!configured) {
    Purchases.configure({ apiKey, ...(userId ? { appUserID: userId } : {}) });
    configured = true;
  } else if (userId && activeUserId !== userId) {
    await Purchases.logIn(userId);
  } else if (!userId) {
    const currentUserId = await Purchases.getAppUserID();
    if (!currentUserId.startsWith("$RCAnonymousID:")) {
      await Purchases.logOut();
    }
  }
  activeUserId = userId ?? null;

  const [customerInfo, offerings] = await Promise.all([
    Purchases.getCustomerInfo(),
    Purchases.getOfferings(),
  ]);

  return {
    customerInfo,
    packages: offerings.current?.availablePackages ?? [],
  };
}

export async function logOutRevenueCat() {
  if (!configured || !activeUserId) return;
  await Purchases.logOut();
  activeUserId = null;
}

export async function presentRevenueCatPaywall() {
  const result = await RevenueCatUI.presentPaywall({
    displayCloseButton: true,
  });

  switch (result) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    default:
      return false;
  }
}

export async function presentRevenueCatCustomerCenter() {
  await RevenueCatUI.presentCustomerCenter();
}
