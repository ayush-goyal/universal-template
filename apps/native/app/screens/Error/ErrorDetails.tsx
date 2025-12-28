import { ErrorInfo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  return (
    <SafeAreaView className="flex-1 items-center px-6 pt-8">
      <View className="flex-1 items-center">
        <Text className="mb-4 text-lg font-bold text-accent">Something went wrong!</Text>
        <Text className="text-text">We're sorry, but something went wrong. Please try again.</Text>
      </View>

      <ScrollView
        className="flex-2 my-4 w-full rounded-lg bg-background-subtle"
        contentContainerClassName="p-4"
      >
        <Text className="font-bold text-accent">{`${props.error}`.trim()}</Text>
        <Text selectable className="mt-4 text-text-muted">
          {`${props.errorInfo?.componentStack ?? ""}`.trim()}
        </Text>
      </ScrollView>

      <TouchableOpacity
        className="my-4 self-center rounded-lg bg-accent px-12"
        onPress={props.onReset}
      >
        <Text className="py-2.5 text-center font-bold text-on-accent">Reset</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
