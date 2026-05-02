import { Platform } from "react-native";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { PhoneNumberInputScreen } from "@/screens/Login/PhoneNumberInputScreen";
import { VerifyCodeScreen } from "@/screens/Login/VerifyCodeScreen";
import { WelcomeScreen } from "@/screens/Onboarding/WelcomeScreen";
import Config from "../config";
import {
  AuthStackParamList,
  HomeTabStackParamList,
  MainBottomTabsParamList,
  RootStackParamList,
} from "./NavigationTypes";
import { useBackButtonHandler } from "./navigationUtilities";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AuthStackNavigator = () => {
  const themeColors = useThemeColors();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: themeColors.text,
        headerShadowVisible: false,
        headerTitle: "",
        navigationBarColor: themeColors.background,
        ...(Platform.OS === "android" && {
          headerStyle: { backgroundColor: themeColors.background },
        }),
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="PhoneNumberInput" component={PhoneNumberInputScreen} />
      <AuthStack.Screen name="VerifyCode" component={VerifyCodeScreen} />
    </AuthStack.Navigator>
  );
};

const HomeTabStack = createNativeStackNavigator<HomeTabStackParamList>();
const HomeTabStackNavigator = () => {
  const themeColors = useThemeColors();
  return (
    <HomeTabStack.Navigator
      screenOptions={{
        headerTintColor: themeColors.text,
        headerBackButtonDisplayMode: "minimal",
        ...(Platform.OS === "android" && {
          headerStyle: { backgroundColor: themeColors.background },
        }),
      }}
    >
      <HomeTabStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
          headerLargeTitleEnabled: true,
        }}
      />
    </HomeTabStack.Navigator>
  );
};

const MainBottomTabs = createNativeBottomTabNavigator<MainBottomTabsParamList>();
const MainBottomTabsNavigator = () => {
  const themeColors = useThemeColors();

  return (
    <MainBottomTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarMinimizeBehavior: "onScrollDown",
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarStyle: Platform.select({
          android: { backgroundColor: themeColors.background },
        }),
      }}
    >
      <MainBottomTabs.Screen
        name="HomeTab"
        component={HomeTabStackNavigator}
        options={{
          tabBarIcon:
            Platform.OS === "ios"
              ? { type: "sfSymbol", name: "house.fill" }
              : { type: "image", source: { uri: "ic_menu_home" } },
          tabBarLabel: "Home",
        }}
      />
    </MainBottomTabs.Navigator>
  );
};

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes;

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  useBackButtonHandler((routeName) => exitRoutes.includes(routeName));
  const themeColors = useThemeColors();
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
  }

  if (!user) {
    return <AuthStackNavigator />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: themeColors.background,
        contentStyle: {
          backgroundColor: themeColors.background,
        },
      }}
    >
      <RootStack.Screen name="MainBottomTabs" component={MainBottomTabsNavigator} />
    </RootStack.Navigator>
  );
};
