import { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import StyledText from "@/components/StyledText";
import { useTRPC } from "@/libs/trpc";
import { AuthStackParamList } from "@/navigators/NavigationTypes";

export const WelcomeScreen: FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const trpc = useTRPC();

  const { data } = useQuery({
    ...trpc.getUserCount.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });

  const handleContinue = () => {
    navigation.navigate("PhoneNumberInput");
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-between px-8 pb-12 pt-16">
        <View className="flex-1 justify-center">
          <StyledText className="mb-3 text-5xl font-bold tracking-tight">Welcome</StyledText>
          <StyledText className="text-lg leading-7 opacity-50">
            {data ? `Join ${data} users` : "Sign in with your phone number to get started."}
          </StyledText>
        </View>

        <View>
          <TouchableOpacity
            className="items-center rounded-2xl bg-accent py-4"
            onPress={handleContinue}
            activeOpacity={0.7}
          >
            <StyledText className="text-base font-semibold text-on-accent">
              Continue with Phone Number
            </StyledText>
          </TouchableOpacity>

          <StyledText className="mt-4 px-4 text-center text-xs opacity-40">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </StyledText>
        </View>
      </View>
    </SafeAreaView>
  );
};
