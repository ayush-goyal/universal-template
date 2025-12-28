import type { RootStackParamList } from "@/navigators/NavigationTypes";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SubmitHandler } from "react-hook-form";
import type { TextInputProps } from "react-native";
import { forwardRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Phone } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import PhoneInput from "react-phone-number-input/react-native-input";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { cn } from "@/libs/utils";

const DATA_RATES_TEXT =
  "You will receive a text message to verify your account. Message & data rates may apply.";

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
      <View className="bg-input mb-4 h-12 w-full flex-row items-center rounded-md border border-border px-4">
        <Phone size={18} color={themeColors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          ref={ref}
          className="h-full flex-1 text-text"
          placeholder="e.g., +1 650-555-1234"
          autoComplete="tel"
          autoCapitalize="none"
          returnKeyType="done"
          keyboardType="phone-pad"
          placeholderTextColor={themeColors.textMuted}
          style={{ color: themeColors.text }}
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const startPhoneNumberVerification: SubmitHandler<FormValues> = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await sendPhoneNumberOtp(data.phoneNumber);
      navigation.navigate("VerifyCode", { phoneNumber: data.phoneNumber });
    } catch (error: any) {
      console.error("Phone Sign-In Error:", error);
      Alert.alert("Sign-In Error", error.message || "Could not send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="w-full items-center px-4">
          <Text className="mb-6 text-2xl font-bold text-text">Enter Phone Number</Text>

          <Controller
            control={control}
            rules={{
              required: true,
              validate: (value) => isValidPhoneNumber(value, "US"),
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
          <Text className="text-textMuted mb-6 px-4 text-center text-xs">{DATA_RATES_TEXT}</Text>

          <TouchableOpacity
            className={cn(
              "w-full items-center rounded-xl py-4",
              isValid && !isLoading ? "bg-black" : "bg-gray-300"
            )}
            onPress={handleSubmit(startPhoneNumberVerification)}
            disabled={!isLoading && !isValid}
          >
            <Text className="text-base font-semibold text-on-accent">
              {isLoading ? "Sending..." : "Send Code"}
            </Text>
          </TouchableOpacity>

          <Text className="text-textMuted mt-4 px-4 text-center text-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy (Placeholder).
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
