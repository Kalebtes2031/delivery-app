import { confirmPasswordResetOtp } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: BRAND_COLOR,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            shadowColor: BRAND_COLOR,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}>
            <Ionicons name="checkmark" size={48} color="white" />
          </View>
          <Text style={{
            fontSize: 24,
            fontWeight: '900',
            color: '#1E293B',
            textAlign: 'center',
          }}>
            {t("resetPassword.successTitle")}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#64748B',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 32,
          }}>
            {successMessage}
          </Text>
          <TouchableOpacity
            onPress={handleSuccessClose}
            style={{
              backgroundColor: BRAND_COLOR,
              borderRadius: 20,
              paddingVertical: 14,
              paddingHorizontal: 32,
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              {t("resetPassword.signIn")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      
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
              backgroundColor: 'rgba(103, 80, 164, 0.1)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={BRAND_COLOR} />
            <Text style={{ color: BRAND_COLOR, fontWeight: '600', fontSize: 14 }}>
              {t("resetPassword.back")}
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 32, marginTop: 60 }}>
            <Image
              source={require('@/assets/images/qinemartethio.jpeg')}
              style={{ width: 150, height: 100 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 24,
                fontWeight: '900',
                color: BRAND_COLOR,
                letterSpacing: 1,
                marginTop: 16,
              }}
            >
              {t("resetPassword.title")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#64748B',
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
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FCA5A5',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16,
            }}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontSize: 14, flex: 1, marginLeft: 8 }}>
                {apiError}
              </Text>
            </View>
          ) : null}

          {/* New Password Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: BRAND_COLOR,
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
                  backgroundColor: '#fff',
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  paddingRight: 50,
                  color: BRAND_COLOR,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: errors.newPassword ? '#DC2626' : BRAND_COLOR,
                }}
                placeholder={t("resetPassword.newPasswordPlaceholder")}
                placeholderTextColor="#94A3B8"
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
                  color={BRAND_COLOR}
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && (
              <Text style={{
                color: '#DC2626',
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
              color: BRAND_COLOR,
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
                  backgroundColor: '#fff',
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  paddingRight: 50,
                  color: BRAND_COLOR,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: errors.confirmPassword ? '#DC2626' : BRAND_COLOR,
                }}
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                placeholderTextColor="#94A3B8"
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
                  color={BRAND_COLOR}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={{
                color: '#DC2626',
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
              backgroundColor: BRAND_COLOR,
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
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                {t("resetPassword.button")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}