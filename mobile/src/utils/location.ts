import {Alert, PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export type Coords = {lat: number; lng: number};

export const DHAKA_CENTER: Coords = {lat: 23.7815, lng: 90.4113};

export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location permission',
          message:
            'Khadya Bachao uses your location to find food listings near you.',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }
    return await new Promise<Coords>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        pos => resolve({lat: pos.coords.latitude, lng: pos.coords.longitude}),
        reject,
        {enableHighAccuracy: true, timeout: 15000},
      );
    });
  } catch {
    Alert.alert(
      'Location unavailable',
      'Could not read your location. Showing Dhaka city center instead.',
    );
    return null;
  }
}
