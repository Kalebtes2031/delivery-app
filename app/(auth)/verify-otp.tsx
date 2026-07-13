import { validatePasswordResetOtp } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
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
              {t("verifyOtp.back")}
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
              {t("verifyOtp.title")}
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
              {t("verifyOtp.subtitle", { email })}
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

          {/* OTP Input */}
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
              {t("verifyOtp.otpLabel")}
            </Text>
            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 101,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: BRAND_COLOR,
                fontSize: 14,
                borderWidth: 1,
                borderColor: errors.otp ? '#DC2626' : BRAND_COLOR,
                textAlign: 'center',
                letterSpacing: 4,
              }}
              placeholder={t("verifyOtp.otpPlaceholder")}
              placeholderTextColor="#94A3B8"
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
                color: '#DC2626',
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
                {t("verifyOtp.continue")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}