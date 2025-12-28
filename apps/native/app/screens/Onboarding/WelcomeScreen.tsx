import { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import StyledText from "@/components/StyledText";
import { useAuth } from "@/contexts/AuthContext";
import { useTRPC } from "@/libs/trpc";
import { HomeTabStackScreenProps } from "@/navigators/NavigationTypes";
import { useSafeAreaInsetsStyle } from "../../hooks/useSafeAreaInsetsStyle";

interface WelcomeScreenProps extends HomeTabStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = () => {
  const insets = useSafeAreaInsetsStyle(["top", "bottom"]);
  const trpc = useTRPC();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();

  const { data } = useQuery({
    ...trpc.getUserCount.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });

  const handleSignInPress = () => {
    navigation.navigate("PhoneNumberInput");
  };

  const handleSignOutPress = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={insets} className="flex-1 bg-background">
      <View className="flex-1 px-8 py-12">
        {user ? (
          // Signed In View
          <View className="flex-1 justify-between">
            <View>
              <StyledText className="mb-2 text-4xl font-bold tracking-tight">Welcome</StyledText>
              <StyledText className="text-base opacity-50">
                {data ? `${data} total users` : ""}
              </StyledText>

              <View className="mt-12 gap-6">
                {user.phoneNumber && (
                  <View className="gap-1">
                    <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                      Phone
                    </StyledText>
                    <StyledText className="text-xl font-semibold">{user.phoneNumber}</StyledText>
                  </View>
                )}

                <View className="gap-1">
                  <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                    Email
                  </StyledText>
                  <StyledText className="text-xl font-semibold">{user.email}</StyledText>
                </View>

                <View className="gap-1">
                  <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                    Name
                  </StyledText>
                  <StyledText className="text-xl font-semibold">{user.name}</StyledText>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className="mt-8 items-center rounded-2xl bg-accent py-4"
              onPress={handleSignOutPress}
              activeOpacity={0.7}
            >
              <StyledText className="text-base font-semibold text-on-accent">Sign Out</StyledText>
            </TouchableOpacity>
          </View>
        ) : (
          // Signed Out View
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center">
              <StyledText className="mb-3 text-5xl font-bold tracking-tight">Hello</StyledText>
              <StyledText className="text-base opacity-50">
                {data ? `Join ${data} users` : "Get started"}
              </StyledText>
            </View>

            <TouchableOpacity
              className="items-center rounded-2xl bg-accent py-4"
              onPress={handleSignInPress}
              activeOpacity={0.7}
            >
              <StyledText className="text-base font-semibold text-on-accent">Sign In</StyledText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
