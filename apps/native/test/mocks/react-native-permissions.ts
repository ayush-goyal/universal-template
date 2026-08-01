/**
 * `react-native-permissions` calls `TurboModuleRegistry.getEnforcing('RNPermissions')` at import
 * time, so it throws in Jest for any module that merely imports it. Registered globally in
 * test/setup.ts; tests that care about permission flows override this with their own jest.mock.
 */
export const RESULTS = {
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
  DENIED: "denied",
  GRANTED: "granted",
  LIMITED: "limited",
} as const;

export const PERMISSIONS = { ANDROID: {}, IOS: {} };

export const check = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const request = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const checkNotifications = jest.fn().mockResolvedValue({ status: RESULTS.GRANTED });
export const requestNotifications = jest.fn().mockResolvedValue({ status: RESULTS.GRANTED });
export const openSettings = jest.fn().mockResolvedValue(undefined);
