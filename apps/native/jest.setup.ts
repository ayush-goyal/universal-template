import "react-native-gesture-handler/jestSetup";

// @ts-expect-error -- polyfill for Expo's import.meta usage
globalThis.__ExpoImportMetaRegistry = {
  url: "file:///test",
};

jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  })),
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: jest.fn((component: any) => component),
  captureException: jest.fn(),
  ReactNativeTracing: jest.fn(),
  ReactNavigationInstrumentation: jest.fn(),
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("posthog-react-native", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  usePostHog: jest.fn(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  })),
}));

// Silence logs in tests
jest.spyOn(console, "log").mockImplementation();
jest.spyOn(console, "warn").mockImplementation();
