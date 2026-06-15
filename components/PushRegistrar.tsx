// components/PushRegistrar.tsx
// Registers for push when the driver is authenticated and surfaces foreground
// notifications via an Alert. Renders nothing.
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  registerForPush,
  unregisterForPush,
  setupForegroundHandler,
  setupTokenRefresh,
} from '@/services/push';

export default function PushRegistrar() {
  const { isAuthenticated } = useAuth();

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
