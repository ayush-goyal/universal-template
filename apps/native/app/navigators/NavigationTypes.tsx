import { ComponentProps } from "react";
import { NativeBottomTabScreenProps } from "@react-navigation/bottom-tabs/unstable";
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  MainBottomTabs: NavigatorScreenParams<MainBottomTabsParamList>;
  PhoneNumberInput: undefined;
  VerifyCode: {
    phoneNumber: string;
  };
};
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type HomeTabStackParamList = {
  Welcome: undefined;
};
export type HomeTabStackScreenProps<T extends keyof HomeTabStackParamList> = CompositeScreenProps<
  NativeBottomTabScreenProps<HomeTabStackParamList, T>,
  MainBottomTabsScreenProps<keyof MainBottomTabsParamList>
>;

export type MainBottomTabsParamList = {
  HomeTab: undefined;
};
export type MainBottomTabsScreenProps<T extends keyof MainBottomTabsParamList> =
  CompositeScreenProps<
    NativeBottomTabScreenProps<MainBottomTabsParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<RootStackParamList>>> {}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
