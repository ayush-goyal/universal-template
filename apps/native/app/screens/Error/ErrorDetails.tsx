import { ErrorInfo } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/contexts/ThemeContext";

export interface ErrorDetailsProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset(): void;
}

/**
 * Renders the error details screen.
 * @param {ErrorDetailsProps} props - The props for the `ErrorDetails` component.
 * @returns {JSX.Element} The rendered `ErrorDetails` component.
 */
export function ErrorDetails(props: ErrorDetailsProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView className="flex-1 items-center px-6 pt-8">
      <View className="flex-1 items-center">
        <Text className="text-accent mb-4 text-lg font-bold">Something went wrong!</Text>
        <Text className="text-text">We're sorry, but something went wrong. Please try again.</Text>
      </View>

      <ScrollView
        className="bg-background-subtle my-4 w-full flex-2 rounded-lg"
        contentContainerClassName="p-4"
      >
        <Text className="text-accent font-bold">{`${props.error}`.trim()}</Text>
        <Text selectable className="text-text-muted mt-4">
          {`${props.errorInfo?.componentStack ?? ""}`.trim()}
        </Text>
      </ScrollView>

      <TouchableOpacity
        className="bg-accent my-4 self-center rounded-lg px-12"
        onPress={props.onReset}
      >
        <Text className="text-on-accent py-2.5 text-center font-bold">Reset</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
