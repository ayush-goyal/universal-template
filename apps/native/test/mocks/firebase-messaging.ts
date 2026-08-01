/**
 * `@react-native-firebase/messaging` instantiates a native event emitter at import time and
 * throws "Native module RNFBAppModule not found" under Jest. Registered globally in
 * test/setup.ts so any screen that reaches NotificationContext can be rendered; tests that
 * exercise messaging itself override this with their own jest.mock.
 */
export const getMessaging = jest.fn(() => ({ app: "test" }));
export const getToken = jest.fn().mockResolvedValue("test-fcm-token");
export const getInitialNotification = jest.fn().mockResolvedValue(null);
export const onMessage = jest.fn(() => jest.fn());
export const onNotificationOpenedApp = jest.fn(() => jest.fn());
export const onTokenRefresh = jest.fn(() => jest.fn());
