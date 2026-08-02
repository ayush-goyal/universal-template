import { FC } from "react";
import { ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";

import StyledText from "@/components/StyledText";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTRPC } from "@/libs/trpc";
import { HomeTabStackScreenProps } from "@/navigators/NavigationTypes";

type HomeScreenProps = HomeTabStackScreenProps<"Home">;

export const HomeScreen: FC<HomeScreenProps> = () => {
  const trpc = useTRPC();

  const { data } = useQuery({
    ...trpc.getUserCount.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-2 px-6 pb-8"
    >
      <StyledText className="text-base">Welcome back.</StyledText>
      <StyledText className="text-base opacity-50">{data ? `${data} total users` : ""}</StyledText>
      <UpgradePrompt />
    </ScrollView>
  );
};
