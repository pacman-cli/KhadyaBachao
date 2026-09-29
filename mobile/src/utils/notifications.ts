import {Alert, Platform} from 'react-native';
import Config from 'react-native-config';
import {api} from '../api/client';
import {getToken} from '../api/tokenRef';

const FIREBASE_ENABLED = Config.FIREBASE_ENABLED === 'true';
export const NOTIFICATION_CHANNEL_ID = 'khadya_alerts';

type RemoteMessageLike = {
  notification?: {title?: string; body?: string};
  data?: Record<string, string>;
};

type OpenHandler = (data: Record<string, string>) => void;

let openHandler: OpenHandler | null = null;

/** App registers this so notification taps can deep-link into screens. */
export function setNotificationOpenHandler(handler: OpenHandler | null): void {
  openHandler = handler;
}

function dispatchOpen(msg: RemoteMessageLike | null): void {
  if (msg?.data && openHandler) {
    openHandler(msg.data);
  }
}

if (FIREBASE_ENABLED) {
  try {
    const messaging = require('@react-native-firebase/messaging').default;

    // Foreground: system does NOT display notification-message pushes while
    // the app is open — surface them as an alert so events are never silent.
    messaging().onMessage((msg: RemoteMessageLike) => {
      if (msg.notification?.title) {
        Alert.alert(msg.notification.title, msg.notification.body);
      }
      dispatchOpen(msg);
    });

    // App running in background and the user taps the system notification.
    messaging().onNotificationOpenedApp(dispatchOpen);

    // App launched cold from a terminated state by tapping a notification.
    messaging()
      .getInitialNotification()
      .then(dispatchOpen)
      .catch(() => undefined);

    // Play Services rotates FCM tokens (reinstall, restore, security patch) —
    // re-register so the backend never pushes to a stale token.
    messaging().onTokenRefresh(() => {
      registerDeviceToken().catch(() => undefined);
    });
  } catch (e) {
    console.warn('Firebase messaging init skipped:', e);
  }
}

/**
 * Requests notification permission (POST_NOTIFICATIONS on Android 13+),
 * fetches the FCM token and registers it with the backend. No-ops unless
 * FIREBASE_ENABLED=true in .env.
 */
export async function registerDeviceToken(): Promise<void> {
  if (!FIREBASE_ENABLED) {
    return;
  }
  // A session must exist: deleteToken() during logout fires onTokenRefresh,
  // which would otherwise immediately re-register a fresh token via an
  // unauthenticated POST (401 → needless re-logout churn).
  if (!getToken()) {
    return;
  }
  const messaging = require('@react-native-firebase/messaging').default;

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) {
    return;
  }

  if (Platform.OS === 'android') {
    await messaging().setAutoInitEnabled(true);
  }

  const token = await messaging().getToken();
  if (!token) {
    return;
  }

  const devicePlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  await api.post('/api/devices/register', {token, platform: devicePlatform});
}

/**
 * Logout counterpart: deletes the local FCM token so Play Services rotates it
 * on next login, and this device stops receiving the previous user's pushes.
 * (The backend keeps the token until FCM invalidates it — acceptable: the
 * token is device-scoped, not user-scoped.)
 */
export async function unregisterDeviceToken(): Promise<void> {
  if (!FIREBASE_ENABLED) {
    return;
  }
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    await messaging().deleteToken();
  } catch {
    // token already gone / Play Services unavailable
  }
}
