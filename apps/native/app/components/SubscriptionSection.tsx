import { FC, useState } from "react";
import { Linking, Platform } from "react-native";
import Toast from "react-native-toast-message";

import { getPlan } from "@acme/shared";

import { Button, FieldGroup, Row, Spacer, Text } from "@/components/native-ui";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useUsage } from "@/hooks/useUsage";
import { isRevenueCatConfigured } from "@/libs/revenueCat";

/**
 * Apple and Google both require a subscription to be manageable from inside the app, and both only
 * allow that as a link out to their own settings.
 */
const MANAGE_SUBSCRIPTIONS_URL = Platform.select({
  ios: "https://apps.apple.com/account/subscriptions",
  android: "https://play.google.com/store/account/subscriptions",
  default: "https://apps.apple.com/account/subscriptions",
});

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The Subscription block of the settings screen: current plan, what is left of the free quota, and
 * the paywall / restore / manage actions.
 *
 * Entitlement comes from the server so a purchase made on the web through Stripe shows up here too.
 */
export const SubscriptionSection: FC = () => {
  const { entitlement, isPro, isLoading, planName, refresh } = useEntitlement();
  const { presentPaywall, restorePurchases } = useRevenueCat();
  const { data: usage } = useUsage();
  const [pending, setPending] = useState<"paywall" | "restore" | null>(null);

  // Without a store key the paywall cannot open, so offering the button would be a dead end.
  const canPurchase = isRevenueCatConfigured();
  const boughtInStore = entitlement.provider === "revenuecat";
  const renewalDate = formatDate(entitlement.currentPeriodEnd);
  const aiMessages = usage?.aiMessages;

  async function upgrade() {
    setPending("paywall");
    try {
      const purchased = await presentPaywall();
      if (purchased) {
        await refresh();
        Toast.show({ type: "success", text1: "You're on Pro", text2: "Thanks for subscribing." });
      }
    } catch (error) {
      console.error("[billing] the paywall failed", error);
      Toast.show({ type: "error", text1: "Could not open the paywall" });
    } finally {
      setPending(null);
    }
  }

  async function restore() {
    setPending("restore");
    try {
      const restored = await restorePurchases();
      await refresh();
      Toast.show(
        restored
          ? { type: "success", text1: "Purchases restored" }
          : { type: "info", text1: "Nothing to restore", text2: "No active purchase on this ID." }
      );
    } catch (error) {
      console.error("[billing] restore failed", error);
      Toast.show({ type: "error", text1: "Could not restore purchases" });
    } finally {
      setPending(null);
    }
  }

  return (
    <FieldGroup.Section title="Subscription">
      <Row alignment="center">
        <Text>Plan</Text>
        <Spacer flexible />
        <Text className="text-text-muted" testID="subscription-plan">
          {isLoading ? "…" : planName}
        </Text>
      </Row>

      {isPro && renewalDate ? (
        <Row alignment="center">
          <Text>{entitlement.cancelAtPeriodEnd ? "Access ends" : "Renews"}</Text>
          <Spacer flexible />
          <Text className="text-text-muted">{renewalDate}</Text>
        </Row>
      ) : null}

      {!isPro && aiMessages?.limit ? (
        <Row alignment="center">
          <Text>AI messages left today</Text>
          <Spacer flexible />
          <Text className="text-text-muted">{`${aiMessages.remaining ?? 0} of ${aiMessages.limit}`}</Text>
        </Row>
      ) : null}

      {!isPro && canPurchase ? (
        <Button testID="upgrade-to-pro" disabled={pending !== null} onPress={() => void upgrade()}>
          <Text>{`Upgrade to ${getPlan("pro").name}`}</Text>
        </Button>
      ) : null}

      {/* Managing an Apple or Google subscription is only possible in their own settings; a Stripe
          subscription bought on the web is managed there instead. */}
      {isPro && boughtInStore ? (
        <Button variant="text" onPress={() => void Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}>
          <Text>Manage subscription</Text>
        </Button>
      ) : null}

      {isPro && !boughtInStore ? (
        <Row alignment="center">
          <Text className="text-text-muted" numberOfLines={2}>
            Bought on the web. Manage it from the billing page there.
          </Text>
        </Row>
      ) : null}

      {/* Apple requires a visible restore control whenever an app sells subscriptions. */}
      {canPurchase ? (
        <Button
          variant="text"
          testID="restore-purchases"
          disabled={pending !== null}
          onPress={() => void restore()}
        >
          <Text>Restore purchases</Text>
        </Button>
      ) : null}
    </FieldGroup.Section>
  );
};
