import { requestPasswordResetOtp } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Image,
  SafeAreaView,
} from "react-native";

const BRAND_COLOR = "#6750A4";

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useTranslation("auth");

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
  }>({});

  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t("forgotPassword.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t("forgotPassword.emailInvalid");

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRequestOtp = async () => {
    if (!validate()) return;
    setApiError("");
    setLoading(true);

    try {
      await requestPasswordResetOtp(email);
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email }
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.email?.[0] ||
        err?.message ||
        t("forgotPassword.sendFailed");
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 32,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
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
              {t("forgotPassword.back")}
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40, marginTop: 40 }}>
            <View>
              <Image
                source={require('@/assets/images/qinemartethio.jpeg')}
                style={{ width: 200, height: 150 }}
                resizeMode="contain"
              />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '900',
                color: BRAND_COLOR,
                letterSpacing: 1,
                marginTop: 16,
              }}
            >
              {t("forgotPassword.title")}
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
              {t("forgotPassword.subtitle")}
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

          {/* Email Input */}
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
              {t("forgotPassword.emailLabel")}
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
                borderColor: errors.email ? '#DC2626' : BRAND_COLOR,
              }}
              placeholder={t("forgotPassword.emailPlaceholder")}
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({});
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && (
              <Text style={{
                color: '#DC2626',
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4,
              }}>
                {errors.email}
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleRequestOtp}
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
                {t("forgotPassword.sendCode")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Sign In Link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 }}>
            <Text style={{ color: '#64748B', fontSize: 14 }}>
              {t("forgotPassword.rememberedPassword")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.7}
            >
              <Text style={{ color: BRAND_COLOR, fontWeight: '800', fontSize: 14 }}>
                {t("forgotPassword.signIn")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}