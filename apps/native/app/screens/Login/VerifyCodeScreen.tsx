import type { AuthStackParamList } from "@/navigators/NavigationTypes";
import type { RouteProp } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import * as Haptics from "expo-haptics";
import { useRoute } from "@react-navigation/native";
import parsePhoneNumber from "libphonenumber-js";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { cn } from "@/libs/utils";

const VERIFICATION_CODE_LENGTH = 6;

export const VerifyCodeScreen = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const { confirmVerificationCode, sendPhoneNumberOtp } = useAuth();
  const {
    params: { phoneNumber },
  } = useRoute<RouteProp<AuthStackParamList, "VerifyCode">>();
  const themeColors = useThemeColors();
  const hasAutoSubmitted = useRef(false);

  const codeFieldRef = useBlurOnFulfill({
    value: code,
    cellCount: VERIFICATION_CODE_LENGTH,
  });
  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleVerify = useCallback(
    async (verificationCode: string) => {
      if (verificationCode.length !== VERIFICATION_CODE_LENGTH) return;

      setIsLoading(true);
      try {
        await confirmVerificationCode(verificationCode, phoneNumber);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        console.error("Code Verification Error:", error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Verification Failed",
          error.message || "We couldn't verify your code. Please try again or request a new code."
        );
        setCode("");
        hasAutoSubmitted.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [confirmVerificationCode, phoneNumber]
  );

  useEffect(() => {
    if (code.length === VERIFICATION_CODE_LENGTH && !hasAutoSubmitted.current && !isLoading) {
      hasAutoSubmitted.current = true;
      handleVerify(code);
    }
  }, [code, isLoading, handleVerify]);

  const handleResendCode = async () => {
    if (timeLeft > 0 || !phoneNumber) return;

    setResendLoading(true);
    try {
      await sendPhoneNumberOtp(phoneNumber);
      setCode("");
      hasAutoSubmitted.current = false;
      setTimeLeft(30);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      console.error("Resend Code Error:", error);
      Alert.alert(
        "Resend Failed",
        error.message || "We couldn't send a new code. Please try again later."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const formattedPhone = parsePhoneNumber(phoneNumber)?.formatNational() ?? phoneNumber;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        <View className="flex-1 px-8 pt-4">
          <View>
            <Text className="mb-2 text-3xl font-bold text-text">Enter verification{"\n"}code</Text>
            <Text className="mb-10 text-base text-text-muted">
              We sent a 6-digit code to {formattedPhone}
            </Text>
          </View>

          <View>
            {isLoading ? (
              <View className="mb-7 items-center justify-center py-5">
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text className="mt-3 text-sm text-text-muted">Verifying...</Text>
              </View>
            ) : (
              <CodeField
                ref={codeFieldRef}
                {...codeFieldProps}
                value={code}
                onChangeText={setCode}
                cellCount={VERIFICATION_CODE_LENGTH}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={
                  Platform.select({
                    android: "sms-otp",
                    default: "one-time-code",
                  }) as any
                }
                rootStyle={{ marginBottom: 28, justifyContent: "center", gap: 8 }}
                renderCell={({ index, symbol, isFocused }) => (
                  <View
                    key={index}
                    onLayout={getCellOnLayoutHandler(index)}
                    className={cn(
                      "h-16 w-14 items-center justify-center rounded-xl border-2",
                      isFocused ? "border-accent" : symbol ? "border-primary" : "border-border"
                    )}
                    style={{
                      shadowColor: isFocused ? themeColors.accent : "transparent",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                      elevation: isFocused ? 4 : 0,
                    }}
                  >
                    <Text
                      className="text-center text-2xl font-semibold text-text"
                      style={{ color: themeColors.text }}
                    >
                      {symbol || (isFocused ? <Cursor cursorSymbol="|" /> : null)}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>

          <View className="items-center">
            <View className="flex-row items-center">
              <Text className="text-text-muted">Didn&apos;t receive a code? </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={timeLeft > 0 || resendLoading || !phoneNumber}
              >
                <Text
                  className={cn(
                    "font-semibold",
                    timeLeft > 0 || resendLoading || !phoneNumber
                      ? "text-text-muted"
                      : "text-accent"
                  )}
                >
                  {timeLeft > 0
                    ? `Resend in ${timeLeft}s`
                    : resendLoading
                      ? "Sending..."
                      : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
