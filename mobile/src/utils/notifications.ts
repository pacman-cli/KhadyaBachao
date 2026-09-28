import {Platform} from 'react-native';
import Config from 'react-native-config';
import {api} from '../api/client';

export async function createNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const notifee = require('@notifee/react-native').default;
    if (notifee && notifee.createChannel) {
      await notifee.createChannel({
        id: 'khadya_alerts',
        name: 'Khadya Bachao Alerts',
        importance: 4, // HIGH
        vibration: true,
      });
    }
  } catch {
    // notifee optional dependency fallback
  }
}

/**
 * Registers the FCM device token with the backend so pushes can be delivered.
 * Strictly guarded: only runs when FIREBASE_ENABLED=true is set in .env.
 */
export async function registerDeviceToken(): Promise<void> {
  if (Config.FIREBASE_ENABLED !== 'true') {
    return;
  }
  try {
    await createNotificationChannel();
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

    const devicePlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await api.post('/api/devices/register', {token, platform: devicePlatform});

    messaging().onMessage(async (remoteMessage: unknown) => {
      console.log('Foreground notification received:', remoteMessage);
    });

    messaging().onNotificationOpenedApp((remoteMessage: unknown) => {
      console.log('Notification opened:', remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage: unknown) => {
        if (remoteMessage) {
          console.log('App launched from notification:', remoteMessage);
        }
      });
  } catch (e) {
    console.warn('Device token registration skipped:', e);
  }
}
