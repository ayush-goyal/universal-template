import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { ErrorToast, SuccessToast, ToastConfig } from "react-native-toast-message";
import colors from "tailwindcss/colors";

import { useThemeColors } from "@/hooks/useThemeColors";

export const useToastConfig = () => {
  const themeColors = useThemeColors();

  const commonStyle: StyleProp<ViewStyle> = {
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 0,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
    height: "auto",
  };

  const commonTextStyleProps: {
    text1Style: StyleProp<TextStyle>;
    text2Style: StyleProp<TextStyle>;
  } = {
    text1Style: {
      fontSize: 15,
      fontWeight: "700",
      color: themeColors.text,
      letterSpacing: -0.3,
    },
    text2Style: {
      fontSize: 14,
      fontWeight: "400",
      color: themeColors.textMuted,
      letterSpacing: -0.2,
      marginTop: 2,
    },
  };

  const toastConfig: ToastConfig = {
    success: (props) => (
      <SuccessToast
        {...props}
        {...commonTextStyleProps}
        text2NumberOfLines={0}
        style={[
          commonStyle,
          {
            borderLeftColor: colors.green[600],
          },
        ]}
      />
    ),
    warning: (props) => (
      <SuccessToast
        {...props}
        {...commonTextStyleProps}
        text2NumberOfLines={0}
        style={[
          commonStyle,
          {
            borderLeftColor: colors.yellow[600],
          },
        ]}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        {...commonTextStyleProps}
        text2NumberOfLines={0}
        style={[
          commonStyle,
          {
            borderLeftColor: colors.red[600],
          },
        ]}
      />
    ),
  };

  return toastConfig;
};
