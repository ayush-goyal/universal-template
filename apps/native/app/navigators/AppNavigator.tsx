import { Platform } from "react-native";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useThemeColors } from "@/contexts/ThemeContext";
import { PhoneNumberInputScreen } from "@/screens/Login/PhoneNumberInputScreen";
import { VerifyCodeScreen } from "@/screens/Login/VerifyCodeScreen";
import { WelcomeScreen } from "@/screens/Onboarding/WelcomeScreen";
import Config from "../config";
import {
  HomeTabStackParamList,
  MainBottomTabsParamList,
  RootStackParamList,
} from "./NavigationTypes";
import { useBackButtonHandler } from "./navigationUtilities";

const HomeTabStack = createNativeStackNavigator<HomeTabStackParamList>();
const HomeTabStackNavigator = () => {
  const themeColors = useThemeColors();
  return (
    <HomeTabStack.Navigator
      screenOptions={{
        headerShown: false,
        headerTintColor: themeColors.text,
        headerStyle: { backgroundColor: themeColors.background },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <HomeTabStack.Screen name="Welcome" component={WelcomeScreen} />
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
        tabBarInactiveTintColor: themeColors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarStyle: Platform.select({
          android: {
            backgroundColor: themeColors.background,
          },
          ios: {
            backgroundColor: themeColors.background,
          },
        }),
      }}
    >
      <MainBottomTabs.Screen
        name="HomeTab"
        component={HomeTabStackNavigator}
        options={{
          tabBarIcon: Platform.select({
            ios: {
              type: "sfSymbol",
              name: "house.fill",
            },
            android: {
              type: "drawableResource",
              name: "ic_menu_home",
            },
          }),
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
      <RootStack.Group screenOptions={{ presentation: "modal" }}>
        <RootStack.Screen name="PhoneNumberInput" component={PhoneNumberInputScreen} />
        <RootStack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};
