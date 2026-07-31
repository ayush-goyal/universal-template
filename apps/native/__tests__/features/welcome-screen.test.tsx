import { Text } from "react-native";
import { renderInTestStack } from "@test/navigation";
import { screen, userEvent } from "@testing-library/react-native";

import { WelcomeScreen } from "@/screens/Onboarding/WelcomeScreen";

const mockGetUserCount = jest.fn();

jest.mock("@/libs/trpc", () => ({
  useTRPC: () => ({
    getUserCount: {
      queryOptions: () => ({
        queryKey: ["getUserCount"],
        queryFn: mockGetUserCount,
      }),
    },
  }),
}));

function PhoneEntryStub() {
  return <Text>Phone entry destination</Text>;
}

const screens = [
  { name: "Welcome", component: WelcomeScreen },
  { name: "PhoneNumberInput", component: PhoneEntryStub },
];

describe("WelcomeScreen", () => {
  it("shows the user count returned by tRPC", async () => {
    mockGetUserCount.mockResolvedValue(42);

    await renderInTestStack("Welcome", screens);

    expect(await screen.findByText("Join 42 users")).toBeVisible();
  });

  it("navigates to phone entry through the real stack", async () => {
    mockGetUserCount.mockResolvedValue(42);
    const user = userEvent.setup();
    await renderInTestStack("Welcome", screens);
    await screen.findByText("Join 42 users");

    await user.press(screen.getByRole("button", { name: "Continue with Phone Number" }));

    expect(screen.getByText("Phone entry destination")).toBeVisible();
  });
});
