import database from '@react-native-firebase/database';

export const firebaseTracking = {
  /**
   * Updates the driver's current location in the Firebase Realtime Database.
   * Path: deliveries/{trackingId}
   */
  async updateLocation(trackingId: string, latitude: number, longitude: number, heading?: number | null) {
    try {
      const ref = database().ref(`deliveries/${trackingId}`);
      const payload = {
        latitude,
        longitude,
        heading: heading ?? 0,
        updated_at: database.ServerValue.TIMESTAMP,
      };
      console.log('[Firebase] Writing to:', `deliveries/${trackingId}`, payload);
      await ref.update(payload);
      console.log('[Firebase] ✅ Write successful');
    } catch (error: any) {
      console.error('[Firebase] ❌ Write FAILED:', error?.message || error);
      console.error('[Firebase] This usually means your Realtime Database rules are rejecting writes.');
      console.error('[Firebase] Go to Firebase Console → Realtime Database → Rules and set:');
      console.error(`[Firebase] {
  "rules": {
    "deliveries": {
      "$tracking_id": {
        ".read": true,
        ".write": true
      }
    }
  }
}`);
    }
  },

  /**
   * Deletes the tracking node when delivery is completed.
   */
  async stopTracking(trackingId: string) {
    try {
      await database().ref(`deliveries/${trackingId}`).remove();
      console.log('[Firebase] 🗑️ Tracking node removed for:', trackingId);
    } catch (error: any) {
      console.error('[Firebase] Failed to remove tracking node:', error?.message || error);
    }
  },

  /**
   * Subscribes to real-time location updates for a delivery.
   * Returns an unsubscribe function.
   */
  onLocationUpdate(trackingId: string, callback: (coords: { latitude: number; longitude: number; heading?: number }) => void) {
    const ref = database().ref(`deliveries/${trackingId}`);
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
        });
      }
    });
    return () => ref.off();
  },
};
