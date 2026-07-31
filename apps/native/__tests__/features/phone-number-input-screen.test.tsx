import { Alert, Text } from "react-native";
import { useRoute } from "@react-navigation/native";
import { renderInTestStack } from "@test/navigation";
import { screen, userEvent, waitFor } from "@testing-library/react-native";

import { PhoneNumberInputScreen } from "@/screens/Login/PhoneNumberInputScreen";

const mockSendPhoneNumberOtp = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    sendPhoneNumberOtp: mockSendPhoneNumberOtp,
  }),
}));

function VerificationDestination() {
  const route = useRoute();
  const phoneNumber = (route.params as { phoneNumber: string }).phoneNumber;
  return <Text>Verify {phoneNumber}</Text>;
}

const screens = [
  { name: "PhoneNumberInput", component: PhoneNumberInputScreen },
  { name: "VerifyCode", component: VerificationDestination },
];

describe("PhoneNumberInputScreen", () => {
  beforeEach(() => {
    mockSendPhoneNumberOtp.mockResolvedValue(undefined);
  });

  it("keeps submission disabled until the phone number is valid", async () => {
    const user = userEvent.setup();
    await renderInTestStack("PhoneNumberInput", screens);
    const submit = screen.getByRole("button", { name: "Send Code" });

    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Phone number"), "6505551234");

    expect(submit).toBeEnabled();
  });

  it("sends the OTP and navigates with the normalized phone number", async () => {
    const user = userEvent.setup();
    await renderInTestStack("PhoneNumberInput", screens);

    await user.type(screen.getByLabelText("Phone number"), "6505551234");
    await user.press(screen.getByRole("button", { name: "Send Code" }));

    expect(mockSendPhoneNumberOtp).toHaveBeenCalledWith("+16505551234");
    expect(screen.getByText("Verify +16505551234")).toBeVisible();
  });

  it("shows an alert and restores the form after an OTP failure", async () => {
    const user = userEvent.setup();
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockSendPhoneNumberOtp.mockRejectedValue(new Error("Service unavailable"));
    await renderInTestStack("PhoneNumberInput", screens);

    await user.type(screen.getByLabelText("Phone number"), "6505551234");
    await user.press(screen.getByRole("button", { name: "Send Code" }));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Sign-In Error", "Service unavailable");
    });
    expect(screen.getByRole("button", { name: "Send Code" })).toBeEnabled();

    alert.mockRestore();
    consoleError.mockRestore();
  });
});
