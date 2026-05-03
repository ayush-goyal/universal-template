import Toast from "react-native-toast-message";
import { ORPCError } from "@orpc/client";
import { useNetInfo } from "@react-native-community/netinfo";

type DisplayableError =
  | ORPCError<string, unknown>
  | Error
  | { message?: string }
  | null
  | undefined;

export const useMutationManager = () => {
  const netInfo = useNetInfo();

  const displayError = (error: DisplayableError) => {
    if (!netInfo.isInternetReachable) {
      Toast.show({
        type: "warning",
        text1: "No internet connection",
        text2: "Please try again later",
      });
    } else {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message ?? "Please try again later",
      });
    }
  };

  return { displayError };
};
