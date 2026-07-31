import { Alert } from "react-native";
import { renderWithProviders } from "@test/render";
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";

import { VerifyCodeScreen } from "@/screens/Login/VerifyCodeScreen";

const mockConfirmVerificationCode = jest.fn();
const mockSendPhoneNumberOtp = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    confirmVerificationCode: mockConfirmVerificationCode,
    sendPhoneNumberOtp: mockSendPhoneNumberOtp,
  }),
}));

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useRoute: () => ({
      params: { phoneNumber: "+16505551234" },
    }),
  };
});

describe("VerifyCodeScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConfirmVerificationCode.mockResolvedValue(undefined);
    mockSendPhoneNumberOtp.mockResolvedValue(undefined);
  });

  it("automatically submits a complete code exactly once", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<VerifyCodeScreen />);

    await user.type(screen.getByLabelText("Verification code"), "123456");

    await waitFor(() => {
      expect(mockConfirmVerificationCode).toHaveBeenCalledWith("123456", "+16505551234");
    });
    expect(mockConfirmVerificationCode).toHaveBeenCalledTimes(1);
  });

  it("clears a rejected code and allows another attempt", async () => {
    const user = userEvent.setup();
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockConfirmVerificationCode
      .mockRejectedValueOnce(new Error("Wrong code"))
      .mockResolvedValueOnce(undefined);
    await renderWithProviders(<VerifyCodeScreen />);

    await user.type(screen.getByLabelText("Verification code"), "123456");

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Verification Failed", "Wrong code");
    });
    expect(screen.getByLabelText("Verification code")).toHaveDisplayValue("");

    await user.type(screen.getByLabelText("Verification code"), "654321");
    await waitFor(() => {
      expect(mockConfirmVerificationCode).toHaveBeenCalledTimes(2);
    });

    alert.mockRestore();
    consoleError.mockRestore();
  });

  it("enables resend after the countdown and requests a new code", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<VerifyCodeScreen />);

    expect(screen.getByRole("button", { name: "Resend in 30s" })).toBeDisabled();

    for (let second = 0; second < 30; second += 1) {
      await act(() => jest.advanceTimersByTime(1000));
    }

    const resend = screen.getByRole("button", { name: "Resend Code" });
    expect(resend).toBeEnabled();
    await user.press(resend);

    expect(mockSendPhoneNumberOtp).toHaveBeenCalledWith("+16505551234");
  });
});
