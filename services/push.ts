// services/push.ts — FCM registration + handlers for the delivery app.
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDevice, unregisterDevice } from './api';

const APP_NAME = 'delivery' as const;
const TOKEN_KEY = 'fcm_token';
const ANDROID_CHANNEL_ID = 'fcm_fallback_notification_channel';

function platformName(): 'android' | 'ios' | 'web' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android';
}

/** Prevent expo-notifications from duplicating foreground alerts (Firebase onMessage handles those). */
export function configureNotificationPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

/**
 * Request OS notification permission on app start.
 * Safe to call before login — background tray notifications need this on Android 13+.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    configureNotificationPresentation();
    await ensureAndroidNotificationChannel();

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[push] Android POST_NOTIFICATIONS denied');
        return false;
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[push] permission request failed', e);
    return false;
  }
}

/** Create the FCM fallback channel with high importance so background alerts are visible. */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Delivery updates',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
  });
}

/** Get the FCM token and register this device with the backend (requires auth + permission). */
export async function registerForPush(): Promise<string | null> {
  try {
    const permitted = await requestNotificationPermission();
    if (!permitted) {
      console.warn('[push] notification permission not granted');
      return null;
    }

    const token = await messaging().getToken();
    if (!token) return null;

    await registerDevice(token, platformName(), APP_NAME);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log('[push] device registered');
    return token;
  } catch (e) {
    console.warn('[push] register failed', e);
    return null;
  }
}

/** Deactivate this device's token on the backend (call on logout). */
export async function unregisterForPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await unregisterDevice(token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Foreground messages (notification messages aren't auto-shown when app is open). */
export function setupForegroundHandler(
  onMessage: (title: string, body: string, data: Record<string, unknown>) => void,
) {
  return messaging().onMessage(async (msg) => {
    onMessage(
      msg.notification?.title ?? 'Notification',
      msg.notification?.body ?? '',
      (msg.data ?? {}) as Record<string, unknown>,
    );
  });
}

/** Re-register when FCM rotates the token. */
export function setupTokenRefresh() {
  return messaging().onTokenRefresh(async (token) => {
    try {
      await registerDevice(token, platformName(), APP_NAME);
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  });
}
