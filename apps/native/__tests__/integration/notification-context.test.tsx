import { Alert } from "react-native";
import { renderHookWithProviders } from "@test/render";
import { act, waitFor } from "@testing-library/react-native";

import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";

const mockCheckNotifications = jest.fn();
const mockRequestNotifications = jest.fn();
const mockGetToken = jest.fn();
const mockCreateDevice = jest.fn();
let mockTokenRefreshHandler: ((token: string) => void) | undefined;

jest.mock("@react-native-community/hooks", () => ({
  useAppState: () => "active",
}));

jest.mock("react-native-permissions", () => ({
  RESULTS: {
    BLOCKED: "blocked",
    DENIED: "denied",
    GRANTED: "granted",
    LIMITED: "limited",
    UNAVAILABLE: "unavailable",
  },
  checkNotifications: (...args: unknown[]) => mockCheckNotifications(...args),
  requestNotifications: (...args: unknown[]) => mockRequestNotifications(...args),
}));

jest.mock("@react-native-firebase/messaging", () => ({
  getMessaging: () => ({ app: "test" }),
  getToken: (...args: unknown[]) => mockGetToken(...args),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn((_messaging, handler: (token: string) => void) => {
    mockTokenRefreshHandler = handler;
    return jest.fn();
  }),
}));

jest.mock("@/libs/trpc", () => ({
  useTRPC: () => ({
    createDevice: {
      mutationOptions: () => ({
        mutationFn: mockCreateDevice,
      }),
    },
  }),
}));

async function renderNotifications() {
  return renderHookWithProviders(() => useNotifications(), {
    provider: NotificationProvider,
  });
}

describe("NotificationProvider", () => {
  let consoleLog: jest.SpyInstance;
  let consoleError: jest.SpyInstance;
  let consoleWarn: jest.SpyInstance;

  beforeEach(() => {
    consoleLog = jest.spyOn(console, "log").mockImplementation();
    consoleError = jest.spyOn(console, "error").mockImplementation();
    consoleWarn = jest.spyOn(console, "warn").mockImplementation();
    mockCheckNotifications.mockResolvedValue({ status: "granted" });
    mockRequestNotifications.mockResolvedValue({ status: "granted" });
    mockGetToken.mockResolvedValue("initial-token");
    mockCreateDevice.mockResolvedValue(undefined);
    mockTokenRefreshHandler = undefined;
  });

  afterEach(() => {
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it("requests permission and registers the exact fetched token", async () => {
    mockCheckNotifications.mockResolvedValue({ status: "denied" });
    const view = await renderNotifications();

    let granted = false;
    await act(async () => {
      granted = await view.result.current.requestPermission();
    });

    expect(granted).toBe(true);
    expect(mockRequestNotifications).toHaveBeenCalledWith(["alert", "sound", "badge"]);
    expect(mockCreateDevice).toHaveBeenCalledWith(
      {
        fcmToken: "initial-token",
        platform: expect.stringMatching(/IOS|ANDROID/),
      },
      expect.any(Object)
    );
    expect(view.result.current.token).toBe("initial-token");
  });

  it("opens the settings prompt when permission stays denied", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    mockCheckNotifications.mockResolvedValue({ status: "denied" });
    mockRequestNotifications.mockResolvedValue({ status: "blocked" });
    const view = await renderNotifications();

    let granted = true;
    await act(async () => {
      granted = await view.result.current.requestPermission();
    });

    expect(granted).toBe(false);
    expect(alert).toHaveBeenCalledWith(
      "Allow notifications",
      expect.any(String),
      expect.any(Array)
    );
    expect(mockCreateDevice).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("registers the token supplied by the refresh callback", async () => {
    const view = await renderNotifications();
    await waitFor(() => expect(mockTokenRefreshHandler).toBeDefined());

    await act(() => mockTokenRefreshHandler?.("refreshed-token"));

    await waitFor(() => {
      expect(mockCreateDevice).toHaveBeenCalledWith(
        {
          fcmToken: "refreshed-token",
          platform: expect.stringMatching(/IOS|ANDROID/),
        },
        expect.any(Object)
      );
    });
    expect(view.result.current.token).toBe("refreshed-token");
  });
});
