import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(t('login.errors.loginFailed'), t('login.errors.emptyFields'));
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error: any) {
      const message =
        error.response?.status === 401
          ? t('login.errors.invalidCredentials')
          : t('login.errors.somethingWrong');
      Alert.alert(t('login.errors.loginFailed'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View>
              <Image
                source={require('@/assets/images/delivery.jpg')}
                style={{ width: 400, height: 300, }}
                resizeMode="cover"
              />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '900',
                color: '#6750A4',
                letterSpacing: 1,
              }}
            >
              {t('login.title')}
            </Text>
            {/* <Text
              style={{
                fontSize: 14,
                color: '#6750A4',
                marginTop: 8,
              }}
            >
              Sign in to manage your deliveries
            </Text> */}
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#6750A4',
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
                onChangeText={setUsername}
                placeholder={t('login.usernamePlaceholder')}
                placeholderTextColor="#6750A4"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 101,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: '#6750A4',
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: '#6750A4',
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#6750A4',
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
                  onChangeText={setPassword}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor="#6750A4"
                  secureTextEntry={!showPassword}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 101,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: '#6750A4',
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: '#6750A4',
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
                  <Text style={{ color: '#6750A4', fontWeight: '700', fontSize: 14 }}>
                    {showPassword ?
                      <Ionicons name="eye-off" size={24} color="#6750A4" /> :
                      <Ionicons name="eye" size={24} color="#6750A4" />}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: '#6750A4',
              borderRadius: 116,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 32,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                {t('login.signIn')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <Text
            style={{
              textAlign: 'center',
              color: '#475569',
              fontSize: 12,
              marginTop: 32,
            }}
          >
            {t('login.footer')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
