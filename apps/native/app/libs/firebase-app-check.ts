import { getApp } from "@react-native-firebase/app";
import {
  getToken,
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from "@react-native-firebase/app-check";

const app = getApp();

const appCheckProvider = new ReactNativeFirebaseAppCheckProvider();
appCheckProvider.configure({
  android: {
    provider: __DEV__ ? "debug" : "playIntegrity",
  },
  apple: {
    provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
  },
});

initializeAppCheck(app, {
  provider: appCheckProvider,
  isTokenAutoRefreshEnabled: true,
}).then((appCheck) => {
  const checkAppCheckInit = async () => {
    try {
      const { token } = await getToken(appCheck);

      if (token.length > 0) {
        console.log("AppCheck verification passed");
      }
    } catch (error) {
      console.warn("AppCheck verification failed", error);
    }
  };
  if (__DEV__) checkAppCheckInit();
});
