import { validatePasswordResetOtp } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from "@/context/ThemeContext";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Image,
  SafeAreaView,
} from "react-native";

const BRAND_COLOR = "#6750A4";

export default function VerifyOtp() {
  const router = useRouter();
  const { t } = useTranslation("auth");
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{
    otp?: string;
  }>({});

  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!otp.trim()) e.otp = t("verifyOtp.otpRequired");
    else if (otp.length !== 6) e.otp = t("verifyOtp.otpLength");

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleVerify = async () => {
    if (!validate()) return;
    setApiError("");
    setLoading(true);

    try {
      await validatePasswordResetOtp({ email, otp });
      router.push({
        pathname: "/(auth)/reset-password",
        params: { email, otp }
      });
    } catch (err: any) {
      // if the error is like No valid verification code found. Please request a new code.
      // we need to make it multilanguage with amharic. as the err is always in english we need to translate it to amharic
      
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.otp?.[0] ||
        err?.message ||
        t("verifyOtp.verifyFailed");
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -100}
      > 
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: insets.bottom + 20 }}>
          {/* Back Button - Fixed Position */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isDark ? colors.card : '#ffffff',
              borderWidth: 1,
              borderColor: isDark ? colors.border : colors.primary,
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 60 }}>
            <Image
              source={require('@/assets/images/elilita-delivery.jpg')}
              style={{ width: 200, height: 150 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 24,
                fontWeight: '900',
                color: isDark ? colors.text : colors.primary,
                letterSpacing: 1,
                marginTop: 16,
              }}
            >
              {t("verifyOtp.title")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textMuted,
                textAlign: 'center',
                marginTop: 8,
                paddingHorizontal: 16,
              }}
            >
              {t("verifyOtp.subtitle", { email })}
            </Text>
          </View>

          {/* Error Alert */}
          {apiError ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? colors.surface : '#FEF2F2',
              borderWidth: 1,
              borderColor: isDark ? colors.danger : '#FCA5A5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16,
            }}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 14, flex: 1, marginLeft: 8 }}>
                {apiError}
              </Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: isDark ? colors.textMuted : colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 8,
              marginLeft: 4,
            }}>
              {t("verifyOtp.otpLabel")}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.card,
                borderRadius: 101,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: errors.otp ? colors.danger : (isDark ? colors.border : colors.primary),
                textAlign: 'center',
                letterSpacing: 4,
              }}
              placeholder={t("verifyOtp.otpPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, ''));
                if (errors.otp) setErrors({});
              }}
              keyboardType="number-pad"
              maxLength={6}
            />
            {errors.otp && (
              <Text style={{
                color: colors.danger,
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4,
              }}>
                {errors.otp}
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 116,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={{ color: "white", fontSize: 16, fontWeight: '800' }}>
                {t("verifyOtp.continue")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}