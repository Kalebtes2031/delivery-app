// services/pushBackground.ts
// Registers the FCM background handler at module load (must run early, before
// the app mounts). Notification messages are shown by the OS automatically when
// the app is backgrounded/quit — the FCM SDK creates the
// "fcm_fallback_notification_channel" on Android 8+ automatically, and the
// backend sends messages targeting that channel with high priority.

import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
  // no-op: the OS displays notification-type FCM messages automatically
  // while the app is backgrounded or killed.
});
