import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import {
  checkNotifications,
  PermissionStatus,
  requestNotifications,
  RESULTS,
} from "react-native-permissions";
import { useAppState } from "@react-native-community/hooks";
import {
  FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import { useMutation } from "@tanstack/react-query";

import { useTRPC } from "@/libs/trpc";

const messaging = getMessaging();

type NotificationContextType = {
  token: string | null;
  requestPermission: () => Promise<boolean>;
  syncDeviceTokenToServer: (fcmToken?: string) => Promise<void>;
  notificationPermission: PermissionStatus;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const appState = useAppState();
  const [token, setToken] = useState<string | null>(null);
  const trpc = useTRPC();
  const { mutateAsync: createDeviceMutation } = useMutation(trpc.createDevice.mutationOptions());
  const [notificationPermission, setNotificationPermission] = useState<PermissionStatus>(
    RESULTS.DENIED
  );

  const syncDeviceTokenToServer = useCallback(async () => {
    try {
      const fcmToken = await getToken(messaging);
      console.log("FCM token:", fcmToken);
      await createDeviceMutation({
        fcmToken,
        platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
      });
    } catch (error) {
      console.error("Error syncing device token:", error);
    }
  }, [createDeviceMutation]);

  useEffect(() => {
    (async () => {
      const { status } = await checkNotifications();
      setNotificationPermission(status);
    })();
  }, [appState]);

  const showSettingsAlert = useCallback(() => {
    Alert.alert(
      "Allow notifications",
      "Please enable notifications in your device settings to receive alerts.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        { text: "Settings", onPress: () => Linking.openSettings(), isPreferred: true },
      ]
    );
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await checkNotifications();

      if (status === RESULTS.DENIED) {
        const { status: newStatus } = await requestNotifications(["alert", "sound", "badge"]);
        if (newStatus !== RESULTS.GRANTED) {
          showSettingsAlert();
          return false;
        }
      } else if (status !== RESULTS.GRANTED) {
        showSettingsAlert();
        return false;
      }

      // Get FCM token after permissions are granted
      const fcmToken = await getToken(messaging);
      console.log("FCM token:", fcmToken);
      setToken(fcmToken);
      await syncDeviceTokenToServer();

      return true;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [syncDeviceTokenToServer, showSettingsAlert]);

  const handleNotification = useCallback((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    // Implement notification handling and deep linking here
  }, []);

  useEffect(() => {
    const unsubscribe = onTokenRefresh(messaging, (newToken) => {
      setToken(newToken);
      syncDeviceTokenToServer();
    });

    // Handle messages when the app is open
    const foregroundSubscription = onMessage(messaging, async (remoteMessage) => {
      console.log("Received foreground message:", remoteMessage);
    });

    // Handle messages when the app is opened from a background state
    const backgroundSubscription = onNotificationOpenedApp(messaging, (remoteMessage) => {
      console.log("Notification opened app:", remoteMessage);
      handleNotification(remoteMessage);
    });

    // Handle messages when the app is initially launched from a notification
    getInitialNotification(messaging).then((remoteMessage) => {
      if (remoteMessage) {
        console.log("Initial notification:", remoteMessage);

        setTimeout(() => {
          handleNotification(remoteMessage);
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      foregroundSubscription();
      backgroundSubscription();
    };
  }, [syncDeviceTokenToServer, handleNotification]);

  useEffect(() => {
    (async () => {
      try {
        const fcmToken = await getToken(messaging);
        console.log("FCM token:", fcmToken);
      } catch (error) {
        console.warn("Error getting FCM token:", error);
      }
    })();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        token,
        requestPermission,
        syncDeviceTokenToServer,
        notificationPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
