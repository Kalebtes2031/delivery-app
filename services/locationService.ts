import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

export async function requestLocationPermissions() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    Toast.show({
      type: 'error',
      text1: 'Permission denied',
      text2: 'Location access is required for delivery tracking.',
    });
    return false;
  }

  // Background permission is optional but recommended for background tracking
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return {
    foreground: foregroundStatus === 'granted',
    background: backgroundStatus === 'granted'
  };
}

export async function startLocationWatcher(onUpdate: (location: Location.LocationObject) => void) {
  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // 10 meters
      timeInterval: 5000,    // 5 seconds
    },
    onUpdate
  );
}
