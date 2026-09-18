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
      console.error('[Firebase] Check your google-services.json and Firebase Console Rules.');
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

  /**
   * Updates driver's idle presence location in Firebase Realtime Database.
   * Path: drivers/{driverId}
   */
  async updateDriverLocation(driverId: number, latitude: number, longitude: number, heading?: number | null) {
    try {
      const ref = database().ref(`drivers/${driverId}`);
      
      const payload = {
        latitude,
        longitude,
        heading: heading ?? 0,
        is_online: true,
        updated_at: database.ServerValue.TIMESTAMP,
      };

      // Set up onDisconnect to automatically mark driver offline if connection is lost
      await ref.onDisconnect().update({
        is_online: false,
        updated_at: database.ServerValue.TIMESTAMP,
      });

      await ref.update(payload);
    } catch (error: any) {
      console.error('[Firebase] Failed to update driver presence:', error?.message || error);
    }
  },

  /**
   * Marks driver as offline in Firebase.
   */
  async setDriverOffline(driverId: number) {
    try {
      const ref = database().ref(`drivers/${driverId}`);
      await ref.update({
        is_online: false,
        updated_at: database.ServerValue.TIMESTAMP,
      });
    } catch (error: any) {
      console.error('[Firebase] Failed to set driver offline:', error?.message || error);
    }
  },
};

