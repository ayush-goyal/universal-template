import type { RootStackParamList } from "@/navigators/NavigationTypes";
import type { RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
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
  const navigation = useNavigation();
  const {
    params: { phoneNumber },
  } = useRoute<RouteProp<RootStackParamList, "VerifyCode">>();
  const themeColors = useThemeColors();

  // For CodeField component
  const codeFieldRef = useBlurOnFulfill({
    value: code,
    cellCount: VERIFICATION_CODE_LENGTH,
  });
  const [codeFieldProps, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  // Countdown timer for resend button
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleVerify = async () => {
    if (code.length !== VERIFICATION_CODE_LENGTH) {
      Alert.alert("Invalid Code", "Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      await confirmVerificationCode(code, phoneNumber);
      navigation.navigate("MainBottomTabs", { screen: "HomeTab", pop: true });
    } catch (error: any) {
      console.error("Code Verification Error:", error);
      Alert.alert(
        "Verification Failed",
        error.message || "We couldn't verify your code. Please try again or request a new code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0 || !phoneNumber) return;

    setResendLoading(true);
    try {
      await sendPhoneNumberOtp(phoneNumber);
      setCode("");
      setTimeLeft(30);
      Alert.alert("Success", "A new verification code has been sent.");
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

  return (
    <SafeAreaView className="bg-background flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-text mb-3 text-center text-2xl font-bold">Verification Code</Text>

          <Text className="text-textMuted mb-8 text-center text-base">
            Enter the 6-digit code sent to {parsePhoneNumber(phoneNumber)?.formatNational()}
          </Text>

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
            rootStyle={{ marginBottom: 28 }}
            renderCell={({ index, symbol, isFocused }) => (
              <View
                key={index}
                onLayout={getCellOnLayoutHandler(index)}
                className={cn(
                  "mx-1 h-14 w-12 items-center justify-center rounded-lg border",
                  isFocused ? "border-primary" : "border-border"
                )}
                style={{
                  shadowColor: isFocused ? themeColors.primary : "transparent",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: isFocused ? 3 : 0,
                }}
              >
                <Text className="text-text text-center text-xl" style={{ color: themeColors.text }}>
                  {symbol || (isFocused ? <Cursor cursorSymbol="|" /> : null)}
                </Text>
              </View>
            )}
          />

          <View className="mb-8 flex-row items-center justify-center">
            <Text className="text-textMuted">Didn't receive a code? </Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={timeLeft > 0 || resendLoading || !phoneNumber}
            >
              <Text
                className={cn(
                  "font-medium",
                  timeLeft > 0 || resendLoading || !phoneNumber ? "text-textMuted" : "text-primary"
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

          <TouchableOpacity
            className={cn(
              "mb-6 w-full items-center rounded-lg py-4",
              code.length === VERIFICATION_CODE_LENGTH && !isLoading ? "bg-black" : "bg-gray-500"
            )}
            onPress={handleVerify}
            disabled={code.length !== VERIFICATION_CODE_LENGTH || isLoading}
          >
            <Text className="text-on-accent text-base font-semibold">
              {isLoading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>

          <Text className="text-textMuted mt-4 px-4 text-center text-xs">
            By verifying your account, you agree to our Terms of Service and Privacy Policy. Carrier
            message and data rates may apply.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
