import * as Location from 'expo-location';
import { firebaseTracking } from './firebaseTracking';

let locationSubscription: Location.LocationSubscription | null = null;

export const driverLocationService = {
  /**
   * Start tracking the driver's location and broadcasting to Firebase `drivers/{driverId}`.
   */
  async startPresenceTracking(driverId: number) {
    try {
      // Check/request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[DriverLocation] Permission to access location was denied');
        return false;
      }

      // Stop existing watcher if already active
      if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
      }

      // Broadcast initial position immediately
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (initialLocation?.coords) {
          await firebaseTracking.updateDriverLocation(
            driverId,
            initialLocation.coords.latitude,
            initialLocation.coords.longitude,
            initialLocation.coords.heading
          );
        }
      } catch (e) {
        console.warn('[DriverLocation] Could not get immediate location, watching...', e);
      }

      // Start watching position: 15s interval or 25m movement delta
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 25,
        },
        async (location) => {
          if (location?.coords) {
            await firebaseTracking.updateDriverLocation(
              driverId,
              location.coords.latitude,
              location.coords.longitude,
              location.coords.heading
            );
          }
        }
      );

      console.log('[DriverLocation] 🚀 Presence tracking started for driver:', driverId);
      return true;
    } catch (err) {
      console.error('[DriverLocation] Failed to start presence tracking:', err);
      return false;
    }
  },

  /**
   * Stop tracking and set driver offline in Firebase.
   */
  async stopPresenceTracking(driverId: number) {
    try {
      if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
      }
      await firebaseTracking.setDriverOffline(driverId);
      console.log('[DriverLocation] 🛑 Presence tracking stopped for driver:', driverId);
    } catch (err) {
      console.error('[DriverLocation] Failed to stop presence tracking:', err);
    }
  },
};
