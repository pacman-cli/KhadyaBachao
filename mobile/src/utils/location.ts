import {Alert, PermissionsAndroid, Platform} from 'react-native';
// @react-native-community/geolocation uses the framework LocationManager and
// carries no play-services dependency. react-native-geolocation-service (the
// previous pick) is unmaintained and binary-incompatible with the interface-
// era play-services-location (21.0.0+) that react-native-maps requires, which
// crashed the app with IncompatibleClassChangeError on the Discover screen.
import Geolocation from '@react-native-community/geolocation';

export type Coords = {lat: number; lng: number};

export const DHAKA_CENTER: Coords = {lat: 23.7815, lng: 90.4113};

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    const fineGranted =
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted =
      granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;

    return fineGranted || coarseGranted;
  } catch {
    return false;
  }
}

export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Location permission denied',
        'Location permission is required to detect position.',
      );
      return null;
    }

    return await new Promise<Coords | null>(resolve => {
      try {
        Geolocation.getCurrentPosition(
          pos => resolve({lat: pos.coords.latitude, lng: pos.coords.longitude}),
          _error => {
            Alert.alert(
              'Location unavailable',
              'Could not read your location. Showing Dhaka city center instead.',
            );
            resolve(null);
          },
          {
            // High accuracy targets the GPS provider. On the emulator the
            // network provider has no fix and the low-accuracy request hung
            // forever; GPS (via `adb emu geo fix` on emulator, real GPS on
            // devices) always has a fix here.
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      } catch {
        Alert.alert(
          'Location unavailable',
          'Could not read your location. Showing Dhaka city center instead.',
        );
        resolve(null);
      }
    });
  } catch {
    Alert.alert(
      'Location error',
      'Could not read your location. Showing Dhaka city center instead.',
    );
    return null;
  }
}
