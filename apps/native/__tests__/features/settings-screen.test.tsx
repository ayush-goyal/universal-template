import type { ComponentProps } from "react";
import { renderWithProviders } from "@test/render";
import { screen, userEvent } from "@testing-library/react-native";
import { setThemePreference } from "@vonovak/react-native-theme-control";

import { SettingsScreen } from "@/screens/Settings/SettingsScreen";

const mockSignOut = jest.fn();
const mockPresentPaywall = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { phoneNumber: "+15551234567", email: "ada@example.com", name: "Ada" },
    signOut: mockSignOut,
  }),
}));

jest.mock("@/contexts/RevenueCatContext", () => ({
  useRevenueCat: () => ({
    canMakePurchases: true,
    isPro: false,
    presentCustomerCenter: jest.fn(),
    presentPaywall: mockPresentPaywall,
    restorePurchases: jest.fn(),
  }),
}));

const screenProps = {} as ComponentProps<typeof SettingsScreen>;

const renderScreen = () => renderWithProviders(<SettingsScreen {...screenProps} />);

describe("SettingsScreen", () => {
  it("applies the chosen theme as a native appearance override", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText("Dark"));

    expect(setThemePreference).toHaveBeenCalledWith("dark");
  });

  it("shows the signed-in account details", async () => {
    await renderScreen();

    expect(screen.getByText("+15551234567")).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
  });

  it("opens the native paywall for a Free user", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText("Upgrade to Pro"));

    expect(mockPresentPaywall).toHaveBeenCalledTimes(1);
  });

  it("signs out", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText("Sign Out"));

    expect(mockSignOut).toHaveBeenCalled();
  });
});
