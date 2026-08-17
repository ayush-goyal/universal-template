import { createUser } from "@test/factories";
import { renderHookWithProviders } from "@test/render";
import { act, waitFor } from "@testing-library/react-native";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserSettingsStore } from "@/libs/stores/user-settings-store";

const mockUseSession = jest.fn();
const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignOut = jest.fn();
const mockPostHog = {
  identify: jest.fn(),
  reset: jest.fn(),
};
const mockPurchasesLogOut = jest.fn();

jest.mock("@/libs/auth-client", () => ({
  authClient: {
    useSession: (...args: unknown[]) => mockUseSession(...args),
    phoneNumber: {
      sendOtp: (...args: unknown[]) => mockSendOtp(...args),
      verify: (...args: unknown[]) => mockVerifyOtp(...args),
    },
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

jest.mock("posthog-react-native", () => ({
  usePostHog: () => mockPostHog,
}));

jest.mock("@/libs/revenueCat", () => ({
  logOutRevenueCat: (...args: unknown[]) => mockPurchasesLogOut(...args),
}));

async function renderAuth() {
  return renderHookWithProviders(() => useAuth(), {
    provider: AuthProvider,
  });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({ data: null, isPending: false });
    mockSendOtp.mockResolvedValue({ data: {}, error: null });
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });
    mockSignOut.mockResolvedValue(undefined);
    mockPurchasesLogOut.mockResolvedValue(undefined);
    useUserSettingsStore.getState().reset();
  });

  it("finishes initialization and exposes the active user", async () => {
    const consoleLog = jest.spyOn(console, "log").mockImplementation();
    const user = createUser();
    mockUseSession.mockReturnValue({
      data: { user, session: {} },
      isPending: false,
    });

    const view = await renderAuth();

    await waitFor(() => expect(view.result.current.isInitializing).toBe(false));
    expect(view.result.current.user).toEqual(user);
    expect(mockPostHog.identify).toHaveBeenCalledWith(user.id);
    consoleLog.mockRestore();
  });

  it("propagates OTP send failures", async () => {
    mockSendOtp.mockResolvedValue({
      data: null,
      error: { message: "OTP unavailable" },
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    const view = await renderAuth();

    await expect(view.result.current.sendPhoneNumberOtp("+16505551234")).rejects.toThrow(
      "OTP unavailable"
    );
    consoleError.mockRestore();
  });

  it("verifies an OTP through the auth client", async () => {
    const view = await renderAuth();

    await view.result.current.confirmVerificationCode("123456", "+16505551234");

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      code: "123456",
      phoneNumber: "+16505551234",
    });
  });

  it("clears user-scoped state when signing out", async () => {
    const view = await renderAuth();
    const { queryClient } = view;
    queryClient.setQueryData(["private"], "cached");
    useUserSettingsStore.getState().setHasCompletedOnboarding(true);

    await act(() => view.result.current.signOut());

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockPostHog.reset).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["private"])).toBeUndefined();
    expect(useUserSettingsStore.getState().hasCompletedOnboarding).toBe(false);
    expect(mockPurchasesLogOut).toHaveBeenCalledTimes(1);
  });
});
