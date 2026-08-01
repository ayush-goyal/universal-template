import { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Refetch the data when the screen is focused. From https://github.com/TanStack/query/discussions/296#discussioncomment-1244793
 */
export const useRefetchOnFocus = (refetch = () => undefined, canRefetch = true) => {
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  useFocusEffect(() => {
    setIsScreenFocused(true); // When screen is focused
    return () => {
      setIsScreenFocused(false);
    }; // When screen is quit
  });

  // The screen still always active in cache so we need to check that the screen is focused in a use effect
  // to dispatch the refetch only one time to avoid the infinity loop
  useEffect(() => {
    if (isScreenFocused && canRefetch) {
      refetch();
    }
  }, [canRefetch, isScreenFocused, refetch]);
};
