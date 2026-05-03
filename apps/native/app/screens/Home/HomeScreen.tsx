import { FC } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import StyledText from "@/components/StyledText";
import { useAuth } from "@/contexts/AuthContext";
import { orpc } from "@/libs/orpc";
import { HomeTabStackScreenProps } from "@/navigators/NavigationTypes";

type HomeScreenProps = HomeTabStackScreenProps<"Home">;

export const HomeScreen: FC<HomeScreenProps> = () => {
  const { user, signOut } = useAuth();

  const { data } = useQuery({
    ...orpc.getUserCount.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });

  const handleSignOutPress = async () => {
    await signOut();
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <View className="flex-1 justify-between px-6 pb-8 pt-4">
        <View>
          <StyledText className="mb-2 text-2xl font-bold tracking-tight">Welcome</StyledText>
          <StyledText className="text-base opacity-50">
            {data ? `${data} total users` : ""}
          </StyledText>

          <View className="mt-12 gap-6">
            {user?.phoneNumber && (
              <View className="gap-1">
                <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                  Phone
                </StyledText>
                <StyledText className="text-xl font-semibold">{user.phoneNumber}</StyledText>
              </View>
            )}

            {user?.email && (
              <View className="gap-1">
                <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                  Email
                </StyledText>
                <StyledText className="text-xl font-semibold">{user.email}</StyledText>
              </View>
            )}

            {user?.name && (
              <View className="gap-1">
                <StyledText className="text-xs font-medium uppercase tracking-wide opacity-40">
                  Name
                </StyledText>
                <StyledText className="text-xl font-semibold">{user.name}</StyledText>
              </View>
            )}
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
    </SafeAreaView>
  );
};
