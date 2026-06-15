// services/pushBackground.ts
// Registers the FCM background handler at module load (must run early). The OS
// shows notification messages automatically while the app is backgrounded/quit,
// so this is a no-op placeholder that also silences the missing-handler warning.
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async () => {
  // no-op
});
