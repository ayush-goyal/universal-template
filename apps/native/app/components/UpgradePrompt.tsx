import { FC } from "react";
import { Pressable } from "react-native";
import Toast from "react-native-toast-message";

import { getPlan } from "@acme/shared";

import StyledText from "@/components/StyledText";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useUsage } from "@/hooks/useUsage";
import { isRevenueCatConfigured } from "@/libs/revenueCat";

/**
 * The nudge a free user sees in-app: what is left of their quota, and a tap to the paywall.
 *
 * Renders nothing for Pro users, and nothing when no store key is configured — a template checkout
 * should not show an upgrade button that cannot open.
 */
export const UpgradePrompt: FC = () => {
  const { isPro, isLoading, refresh } = useEntitlement();
  const { presentPaywall } = useRevenueCat();
  const { data: usage } = useUsage();

  if (isLoading || isPro || !isRevenueCatConfigured()) return null;

  const aiMessages = usage?.aiMessages;

  async function upgrade() {
    try {
      if (await presentPaywall()) {
        await refresh();
        Toast.show({ type: "success", text1: "You're on Pro", text2: "Thanks for subscribing." });
      }
    } catch (error) {
      console.error("[billing] the paywall failed", error);
      Toast.show({ type: "error", text1: "Could not open the paywall" });
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID="upgrade-prompt"
      onPress={() => void upgrade()}
      className="gap-1 rounded-2xl border border-border bg-card p-4 active:opacity-70"
    >
      <StyledText className="text-base font-semibold text-text">
        {`Upgrade to ${getPlan("pro").name}`}
      </StyledText>
      <StyledText className="text-sm text-text-muted">
        {aiMessages?.limit
          ? `${aiMessages.remaining ?? 0} of ${aiMessages.limit} AI messages left today.`
          : getPlan("pro").description}
      </StyledText>
    </Pressable>
  );
};
