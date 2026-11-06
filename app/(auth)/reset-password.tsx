import { confirmPasswordResetOtp } from "@/services/api";
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

export default function ResetPassword() {
  const router = useRouter();
  const { t } = useTranslation("auth");
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { email, otp } = useLocalSearchParams<{ email: string; otp: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!newPassword) e.newPassword = t("resetPassword.newPasswordRequired");
    else if (newPassword.length < 8) e.newPassword = t("resetPassword.passwordMinLength");
    if (!confirmPassword) e.confirmPassword = t("resetPassword.confirmPasswordRequired");
    if (newPassword !== confirmPassword) e.confirmPassword = t("resetPassword.passwordsDoNotMatch");

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setApiError("");
    setLoading(true);

    try {
      await confirmPasswordResetOtp({
        email,
        otp,
        new_password: newPassword
      });

      setSuccessMessage(t("resetPassword.successMessage"));
      setShowSuccess(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.new_password?.[0] ||
        err?.message ||
        t("resetPassword.resetFailed");
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    router.replace("/(auth)/login");
  };

   if (showSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Ionicons name="checkmark" size={48} color={colors.onPrimary} />
          </View>
          <Text style={{
            fontSize: 24,
            fontWeight: '900',
            color: colors.text,
            textAlign: 'center',
          }}>
            {t("resetPassword.successTitle")}
          </Text>
          <Text style={{
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 32,
          }}>
            {successMessage}
          </Text>
          <TouchableOpacity
            onPress={handleSuccessClose}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 20,
              paddingVertical: 14,
              paddingHorizontal: 32,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
          >
            <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '800' }}>
              {t("resetPassword.signIn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
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
              backgroundColor: isDark ? colors.card : 'rgba(103, 80, 164, 0.1)',
              borderWidth: isDark ? 1 : 0,
              borderColor: colors.border,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
              {t("resetPassword.back")}
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 60 }}>
            <Image
              source={require('@/assets/images/elilita-delivery.jpg')}
              style={{ width: 150, height: 100 }}
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
              {t("resetPassword.title")}
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
              {t("resetPassword.subtitle")}
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

          {/* New Password Input */}
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
              {t("resetPassword.newPasswordLabel")}
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  paddingRight: 50,
                  color: colors.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: errors.newPassword ? colors.danger : (isDark ? colors.border : colors.primary),
                }}
                placeholder={t("resetPassword.newPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors({});
                }}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: [{ translateY: -12 }],
                }}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={24}
                  color={isDark ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={{
                color: colors.danger,
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4,
              }}>
                {errors.newPassword}
              </Text>
            )}
          </View>

          {/* Confirm Password Input */}
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
              {t("resetPassword.confirmPasswordLabel")}
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  paddingRight: 50,
                  color: colors.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: errors.confirmPassword ? colors.danger : (isDark ? colors.border : colors.primary),
                }}
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({});
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: [{ translateY: -12 }],
                }}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color={isDark ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={{
                color: colors.danger,
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4,
              }}>
                {errors.confirmPassword}
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleReset}
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
              <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '800' }}>
                {t("resetPassword.button")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}