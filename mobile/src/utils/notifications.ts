import Config from 'react-native-config';
import {api} from '../api/client';

/**
 * Registers the FCM device token with the backend so pushes can be delivered.
 * Strictly guarded: only runs when FIREBASE_ENABLED=true is set in .env AND a
 * google-services.json exists in android/app — otherwise Firebase native init
 * would crash the app.
 */
export async function registerDeviceToken(): Promise<void> {
  if (Config.FIREBASE_ENABLED !== 'true') {
    return;
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
      return;
    }

    const token = await messaging().getToken();
    if (!token) {
      return;
    }

    await api.post('/api/devices/register', {token, platform: 'ANDROID'});

    messaging().onNotificationOpenedApp((remoteMessage: unknown) => {
      console.log('Notification opened:', remoteMessage);
    });
  } catch (e) {
    console.warn('Device token registration skipped:', e);
  }
}
