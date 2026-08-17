import type { ThemePreference } from "@vonovak/react-native-theme-control";
import { FC } from "react";
import * as Application from "expo-application";
import { setThemePreference, useThemePreference } from "@vonovak/react-native-theme-control";

import { Button, FieldGroup, Host, Picker, Row, Spacer, Text } from "@/components/native-ui";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { SettingsTabStackScreenProps } from "@/navigators/NavigationTypes";

type SettingsScreenProps = SettingsTabStackScreenProps<"Settings">;

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export const SettingsScreen: FC<SettingsScreenProps> = () => {
  const preference = useThemePreference();
  const { user, signOut } = useAuth();
  const { canMakePurchases, isPro, presentCustomerCenter, presentPaywall, restorePurchases } =
    useRevenueCat();

  return (
    <Host className="flex-1" testID="settings-host">
      <FieldGroup>
        <FieldGroup.Section title="Appearance">
          <Row alignment="center">
            <Text>Theme</Text>
            <Spacer flexible />
            <Picker
              selectedValue={preference}
              onValueChange={setThemePreference}
              testID="theme-picker"
            >
              {THEME_OPTIONS.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </Row>
        </FieldGroup.Section>

        <FieldGroup.Section title="Account">
          {user?.phoneNumber ? (
            <Row alignment="center">
              <Text>Phone</Text>
              <Spacer flexible />
              <Text className="text-text-muted">{user.phoneNumber}</Text>
            </Row>
          ) : null}
          {user?.email ? (
            <Row alignment="center">
              <Text>Email</Text>
              <Spacer flexible />
              <Text className="text-text-muted">{user.email}</Text>
            </Row>
          ) : null}
          {user?.name ? (
            <Row alignment="center">
              <Text>Name</Text>
              <Spacer flexible />
              <Text className="text-text-muted">{user.name}</Text>
            </Row>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section title="Subscription">
          <Row alignment="center">
            <Text>Plan</Text>
            <Spacer flexible />
            <Text className="text-text-muted">{isPro ? "Pro" : "Free"}</Text>
          </Row>
          {!isPro && canMakePurchases ? (
            <Button testID="upgrade-to-pro" onPress={() => void presentPaywall()}>
              <Text>Upgrade to Pro</Text>
            </Button>
          ) : null}
          {!isPro && !canMakePurchases ? (
            <Row>
              <Text className="text-text-muted">Mobile billing is not configured.</Text>
            </Row>
          ) : null}
          {isPro ? (
            <Button
              variant="text"
              testID="manage-native-subscription"
              onPress={() => void presentCustomerCenter()}
            >
              <Text>Manage Subscription</Text>
            </Button>
          ) : null}
          {canMakePurchases ? (
            <Button
              variant="text"
              testID="restore-purchases"
              onPress={() => void restorePurchases()}
            >
              <Text>Restore Purchases</Text>
            </Button>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section title="About">
          <Row alignment="center">
            <Text>Version</Text>
            <Spacer flexible />
            <Text className="text-text-muted">{Application.nativeApplicationVersion ?? "—"}</Text>
          </Row>
        </FieldGroup.Section>

        <FieldGroup.Section>
          <Button variant="text" testID="sign-out" onPress={() => void signOut()}>
            <Text className="text-destructive">Sign Out</Text>
          </Button>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
};
