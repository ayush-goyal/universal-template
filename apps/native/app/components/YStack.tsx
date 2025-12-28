import type { PropsWithChildren } from "react";
import { View } from "react-native";

import { cn } from "@/libs/utils";

interface Props {
  /**
   * The class name to apply to the stack.
   */
  className?: string;
}

export default function YStack(props: PropsWithChildren<Props>) {
  return <View className={cn("flex flex-col", props.className)}>{props.children}</View>;
}
