// components/PushRegistrar.tsx
// Requests notification permission on app start and registers the FCM device
// with the backend once the driver is authenticated.
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  registerForPush,
  requestNotificationPermission,
  unregisterForPush,
  setupForegroundHandler,
  setupTokenRefresh,
} from '@/services/push';

export default function PushRegistrar() {
  const { isAuthenticated } = useAuth();

  // Ask for notification permission as soon as the app opens.
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      unregisterForPush();
      return;
    }

    registerForPush();
    const unsubMessage = setupForegroundHandler((title, body) => {
      Alert.alert(title, body);
    });
    const unsubRefresh = setupTokenRefresh();

    return () => {
      unsubMessage();
      unsubRefresh();
    };
  }, [isAuthenticated]);

  return null;
}
