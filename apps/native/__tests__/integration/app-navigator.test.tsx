import { NavigationContainer } from "@react-navigation/native";
import { createUser } from "@test/factories";
import { renderWithProviders } from "@test/render";
import { screen } from "@testing-library/react-native";

import { AppNavigator } from "@/navigators/AppNavigator";

const mockUseAuth = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/navigators/navigationUtilities", () => ({
  useBackButtonHandler: jest.fn(),
}));

jest.mock("@/screens/Onboarding/WelcomeScreen", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    WelcomeScreen: () => React.createElement(Text, null, "Welcome route"),
  };
});

jest.mock("@/screens/Login/PhoneNumberInputScreen", () => ({
  PhoneNumberInputScreen: () => null,
}));

jest.mock("@/screens/Login/VerifyCodeScreen", () => ({
  VerifyCodeScreen: () => null,
}));

jest.mock("@/screens/Settings/SettingsScreen", () => ({
  SettingsScreen: () => null,
}));

jest.mock("@/screens/Home/HomeScreen", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    HomeScreen: () => React.createElement(Text, null, "Home route"),
  };
});

function NavigatorUnderTest() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

describe("AppNavigator", () => {
  it("renders nothing while authentication initializes", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isInitializing: true,
    });

    const { toJSON } = await renderWithProviders(<NavigatorUnderTest />);

    expect(toJSON()).toBeNull();
  });

  it("shows the authentication stack when signed out", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isInitializing: false,
    });

    await renderWithProviders(<NavigatorUnderTest />);

    expect(screen.getByText("Welcome route")).toBeVisible();
  });

  it("shows the home route when signed in", async () => {
    mockUseAuth.mockReturnValue({
      user: createUser(),
      isInitializing: false,
    });

    await renderWithProviders(<NavigatorUnderTest />);

    expect(screen.getByText("Home route")).toBeVisible();
  });
});
