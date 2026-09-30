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
// The ChatScreen registers its requestId while focused so foreground pushes
// for the open conversation don't pop a duplicate Alert over the live bubble.
let activeChatRequestId: string | null = null;
// Set during logout's deleteToken() — FCM's onTokenRefresh fires immediately
// after and must not re-register with a dead session.
let registrationSuppressed = false;
// Cold-start deep links arrive before auth/navigation are ready; stash and
// flush them once the user's session is restored.
let pendingOpenData: Record<string, string> | null = null;

export function setNotificationOpenHandler(handler: OpenHandler | null): void {
  openHandler = handler;
}

export function setActiveChatRequestId(requestId: string | null): void {
  activeChatRequestId = requestId;
}

/** Returns and clears a notification-tap payload stashed before auth was ready. */
export function consumePendingOpenData(): Record<string, string> | null {
  const data = pendingOpenData;
  pendingOpenData = null;
  return data;
}

function isSessionActive(): boolean {
  return getToken() !== null;
}

function dispatchOpen(msg: RemoteMessageLike | null): void {
  if (!msg?.data) {
    return;
  }
  if (!isSessionActive()) {
    // Logged out (or still offline at cold start): stash for after bootstrap.
    pendingOpenData = msg.data;
    return;
  }
  if (openHandler) {
    openHandler(msg.data);
  } else {
    pendingOpenData = msg.data;
  }
}

function showForeground(msg: RemoteMessageLike): void {
  if (!isSessionActive()) {
    // Token stays registered server-side after logout — pushes for the
    // previous user must not pop alerts over the Login screen.
    dispatchOpen(msg);
    return;
  }
  // Live bubble already renders inside the focused chat — don't double-notify.
  if (msg.data?.requestId && msg.data.requestId === activeChatRequestId) {
    dispatchOpen(msg);
    return;
  }
  if (msg.notification?.title) {
    Alert.alert(msg.notification.title, msg.notification.body);
  }
  dispatchOpen(msg);
}

if (FIREBASE_ENABLED) {
  try {
    const messaging = require('@react-native-firebase/messaging').default;

    messaging().onMessage(showForeground);
    messaging().onNotificationOpenedApp(dispatchOpen);
    messaging()
      .getInitialNotification()
      .then(dispatchOpen)
      .catch(() => undefined);

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
 * FIREBASE_ENABLED=true in .env AND a user session exists.
 */
export async function registerDeviceToken(): Promise<void> {
  if (!FIREBASE_ENABLED || registrationSuppressed || !isSessionActive()) {
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
 * on next login, and suppresses the onTokenRefresh re-register (which would
 * otherwise POST under the dying session).
 */
export async function unregisterDeviceToken(): Promise<void> {
  if (!FIREBASE_ENABLED) {
    return;
  }
  registrationSuppressed = true;
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    await messaging().deleteToken();
  } catch {
    // token already gone / Play Services unavailable
  }
}

/** Clears the logout suppression on the next successful login. */
export function resumeNotificationRegistration(): void {
  registrationSuppressed = false;
}
