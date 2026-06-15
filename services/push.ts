// services/push.ts — FCM registration + handlers for the delivery app.
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDevice, unregisterDevice } from './api';

const APP_NAME = 'delivery' as const;
const TOKEN_KEY = 'fcm_token';

function platformName(): 'android' | 'ios' | 'web' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android';
}

/** Ask permission, get the FCM token, and register the device with the backend. */
export async function registerForPush(): Promise<string | null> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
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
