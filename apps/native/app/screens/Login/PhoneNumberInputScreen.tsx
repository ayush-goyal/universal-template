import type { AuthStackParamList } from "@/navigators/NavigationTypes";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SubmitHandler } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Phone } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-number-input/react-native-input";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { cn } from "@/libs/utils";

interface FormValues {
  phoneNumber: string;
}

const PhoneInputComponent = forwardRef(
  (
    props: Omit<TextInputProps, "onChangeText"> & { onChangeText: any },
    ref: React.ForwardedRef<any>
  ) => {
    const themeColors = useThemeColors();
    return (
      <View className="h-14 w-full flex-row items-center rounded-xl border border-border bg-background px-4">
        <Phone size={20} color={themeColors.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          ref={ref}
          className="flex-1 text-text"
          placeholder="(650) 555-1234"
          autoComplete="tel"
          autoCapitalize="none"
          returnKeyType="done"
          keyboardType="phone-pad"
          placeholderTextColor={themeColors.textMuted}
          style={{ color: themeColors.text, fontSize: 18, padding: 0 }}
          {...props}
        />
      </View>
    );
  }
);
PhoneInputComponent.displayName = "PhoneInputComponent";

export const PhoneNumberInputScreen = () => {
  const {
    handleSubmit,
    control,
    formState: { isValid },
  } = useForm<FormValues>({
    defaultValues: { phoneNumber: "" },
    mode: "onChange",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { sendPhoneNumberOtp } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const themeColors = useThemeColors();

  const startPhoneNumberVerification: SubmitHandler<FormValues> = async (data: FormValues) => {
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await sendPhoneNumberOtp(data.phoneNumber);
      navigation.navigate("VerifyCode", { phoneNumber: data.phoneNumber });
    } catch (error: any) {
      console.error("Phone Sign-In Error:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Sign-In Error", error.message || "Could not send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = isValid && !isLoading;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <View className="flex-1 px-8 pt-4">
          <View>
            <Text className="mb-2 text-3xl font-bold text-text">
              What&apos;s your{"\n"}phone number?
            </Text>
            <Text className="mb-8 text-base text-text-muted">
              We&apos;ll send you a verification code to sign in.
            </Text>
          </View>

          <View>
            <Controller
              control={control}
              rules={{
                required: true,
                validate: (value) => isValidPhoneNumber(value),
              }}
              render={({ field: { ref, onChange, value } }) => (
                <PhoneInput
                  ref={ref}
                  country="US"
                  onChange={onChange}
                  value={value}
                  inputComponent={PhoneInputComponent}
                />
              )}
              name="phoneNumber"
            />

            <Text className="mt-2 px-1 text-xs text-text-muted">
              Message & data rates may apply.
            </Text>
          </View>

          <View className="mt-8">
            <TouchableOpacity
              className={cn(
                "w-full flex-row items-center justify-center rounded-2xl py-4",
                canSubmit ? "bg-accent" : "bg-background-subtle"
              )}
              onPress={handleSubmit(startPhoneNumberVerification)}
              disabled={!canSubmit}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={themeColors.onAccent} />
              ) : (
                <Text
                  className={cn(
                    "text-base font-semibold",
                    canSubmit ? "text-on-accent" : "text-text-muted"
                  )}
                >
                  Send Code
                </Text>
              )}
            </TouchableOpacity>

            <Text className="mt-4 px-4 text-center text-xs text-text-muted">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
