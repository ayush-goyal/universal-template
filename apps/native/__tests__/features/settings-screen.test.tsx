import type { ComponentProps } from "react";
import { renderWithProviders } from "@test/render";
import { mockTrpc } from "@test/trpc";
import { screen, userEvent } from "@testing-library/react-native";
import { setThemePreference } from "@vonovak/react-native-theme-control";

import { FREE_ENTITLEMENT } from "@acme/shared";

import { RevenueCatProvider } from "@/contexts/RevenueCatContext";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";

const mockSignOut = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user_1", phoneNumber: "+15551234567", email: "ada@example.com", name: "Ada" },
    signOut: mockSignOut,
  }),
}));

const screenProps = {} as ComponentProps<typeof SettingsScreen>;

const renderScreen = () =>
  renderWithProviders(<SettingsScreen {...screenProps} />, { provider: RevenueCatProvider });

describe("SettingsScreen", () => {
  beforeEach(() => {
    mockTrpc("getEntitlement", FREE_ENTITLEMENT);
    mockTrpc("getUsage", {
      aiMessages: { feature: "aiMessagesPerDay", used: 3, limit: 10, remaining: 7, resetsAt: null },
    });
  });

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

  it("shows the plan and what is left of the free quota", async () => {
    await renderScreen();

    expect(await screen.findByText("Free")).toBeVisible();
    expect(await screen.findByText("7 of 10")).toBeVisible();
  });

  it("shows the Pro plan without a quota row once the server says so", async () => {
    mockTrpc("getEntitlement", { ...FREE_ENTITLEMENT, plan: "pro", isPro: true, status: "active" });

    await renderScreen();

    expect(await screen.findByText("Pro")).toBeVisible();
    expect(screen.queryByText("AI messages left today")).toBeNull();
  });

  it("signs out", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText("Sign Out"));

    expect(mockSignOut).toHaveBeenCalled();
  });
});
