import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DeliveryProvider } from '@/context/DeliveryContext';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initI18n } from '@/i18n';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="delivery/tracking" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="language" options={{ headerShown: false }} />
        <Stack.Screen name="myprofile" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch((error) => {
        console.error("Error initializing i18n:", error);
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DeliveryProvider>
          <RootLayoutNav />
        </DeliveryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
