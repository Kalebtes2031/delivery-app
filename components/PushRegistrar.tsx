// components/PushRegistrar.tsx
// Requests notification permission on app start and registers the FCM device
// with the backend once the driver is authenticated.
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDelivery } from '@/context/DeliveryContext';
import Toast from 'react-native-toast-message';
import {
  registerForPush,
  requestNotificationPermission,
  unregisterForPush,
  setupForegroundHandler,
  setupTokenRefresh,
} from '@/services/push';

export default function PushRegistrar() {
  const { isAuthenticated } = useAuth();
  const { refreshAll } = useDelivery();

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
    const unsubMessage = setupForegroundHandler((title, body, data) => {
      Toast.show({
        type: data?.type === 'delivery_declined' ? 'error' : 'info',
        text1: title,
        text2: body,
        position: 'top',
        visibilityTime: 4000,
      });

      // Automatically refresh deliveries and stats when notification arrives in foreground
      refreshAll();
    });
    const unsubRefresh = setupTokenRefresh();

    return () => {
      unsubMessage();
      unsubRefresh();
    };
  }, [isAuthenticated, refreshAll]);

  return null;
}
