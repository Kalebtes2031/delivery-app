import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,

  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuth();
  const { colors, isDark } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');


const handleLogin = async () => {
  // Clear all errors
  setUsernameError('');
  setPasswordError('');
  setGeneralError('');

  let hasError = false;
  if (!username.trim()) {
    setUsernameError(t('login.errors.usernameRequired') || 'Username is required');
    hasError = true;
  }
  if (!password.trim()) {
    setPasswordError(t('login.errors.passwordRequired') || 'Password is required');
    hasError = true;
  }

  if (hasError) {
    return;
  }

  setLoading(true);
  try {
    await login(username.trim(), password);
  } catch (error: any) {
    
    // Clear field errors on login failure
    setUsernameError('');
    setPasswordError('');
    
    // Determine the error message
    let errorMessage = '';
    // Check for 401 status OR SESSION_EXPIRED error
    if (error.response?.status === 401 || error.message === 'SESSION_EXPIRED') {
      errorMessage = t('login.errors.invalidCredentials');
    } else {
      errorMessage = t('login.errors.somethingWrong');
    }
    // Show error as general error banner
    setGeneralError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View>
              <Image
                source={require('@/assets/images/elilita-delivery.jpg')}
                style={{ width: 400, height: 300, }}
                resizeMode="cover"
              />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '900',
                color: isDark ? colors.text : colors.primary,
                letterSpacing: 1,
              }}
            >
              {t('login.title')}
            </Text>
          </View>

          {/* General Error Banner */}
          {generalError ? (
            <View style={{
              backgroundColor: isDark ? colors.surface : '#FEF2F2',
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: isDark ? colors.danger : '#FCA5A5',
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={{
                color: colors.danger,
                fontSize: 13,
                fontWeight: '400',
                flex: 1,
                marginLeft: 8,
              }}>
                {generalError}
              </Text>
              <TouchableOpacity onPress={() => setGeneralError('')}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isDark ? colors.textMuted : colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {t('login.username')}
              </Text>
              <TextInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) setUsernameError('');
                  if (generalError) setGeneralError('');
                }}
                placeholder={t('login.usernamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: usernameError ? colors.danger : (isDark ? colors.border : colors.primary),
                }}
              />
              {usernameError ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginTop: 6,
                    marginLeft: 4,
                  }}
                >
                  {usernameError}
                </Text>
              ) : null}
            </View>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isDark ? colors.textMuted : colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {t('login.password')}
              </Text>
              <View>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                    if (generalError) setGeneralError('');
                  }}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 101,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: passwordError ? colors.danger : (isDark ? colors.border : colors.primary),
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 10,
                  }}
                >
                  <Text style={{ color: isDark ? colors.textMuted : colors.primary, fontWeight: '700', fontSize: 14 }}>
                    {showPassword ?
                      <Ionicons name="eye-off" size={24} color={isDark ? colors.textMuted : colors.primary} /> :
                      <Ionicons name="eye" size={24} color={isDark ? colors.textMuted : colors.primary} />}
                  </Text>
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginTop: 6,
                    marginLeft: 4,
                  }}
                >
                  {passwordError}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 116,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 32,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '800' }}>
                {t('login.signIn')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={{ marginTop: 16, alignItems: 'center' }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <Text
            style={{
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: 12,
              marginTop: 16,
            }}
          >
            {t('login.footer')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
