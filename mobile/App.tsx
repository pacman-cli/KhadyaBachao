import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator, navigationRef} from './src/navigation/RootNavigator';
import {setOnAuthFailure} from './src/api/client';
import {
  consumePendingOpenData,
  setNotificationOpenHandler,
} from './src/utils/notifications';
import {useAuthStore} from './src/store/authStore';

/** Routes a notification data payload to the right screen. */
function routeNotificationData(data: Record<string, string>): void {
  if (!navigationRef.isReady()) {
    return;
  }
  switch (data.type) {
    case 'CLAIM':
    case 'COMPLETED':
      navigationRef.navigate('MyClaims');
      break;
    case 'CHAT':
    case 'SCHEDULE':
      if (data.requestId) {
        navigationRef.navigate('Chat', {requestId: data.requestId});
      } else {
        navigationRef.navigate('MyClaims');
      }
      break;
    case 'VERIFICATION':
    case 'RATING':
      navigationRef.navigate('Profile');
      break;
    default:
      break;
  }
}

function App() {
  // Audit M8: when a 401 survives the refresh attempt, drop the user back to
  // the login screen instead of leaving them in a broken authenticated state.
  useEffect(() => {
    setOnAuthFailure(() => {
      // Same teardown as an explicit logout — a 401 means the session is dead,
      // so the socket/Firebase session must not linger for the next user.
      useAuthStore.getState().logout().catch(() => undefined);
      useAuthStore.setState({user: null, token: null});
    });
    return () => setOnAuthFailure(null);
  }, []);

  // Notification taps deep-link by the backend's data payload:
  // {type: CLAIM|CHAT|COMPLETED|SCHEDULE|VERIFICATION|RATING, requestId?, listingId?}
  // Ignored while logged out — the device token stays registered server-side
  // after logout, and MyClaims/Chat are unregistered screens there.
  useEffect(() => {
    setNotificationOpenHandler(data => {
      if (!useAuthStore.getState().user) {
        return;
      }
      routeNotificationData(data);
    });
    return () => setNotificationOpenHandler(null);
  }, []);

  // Cold-start deep links arrive before auth/navigation are ready and get
  // stashed — flush them as soon as the session is restored.
  const authenticatedUser = useAuthStore(state => state.user);
  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }
    const data = consumePendingOpenData();
    if (data) {
      routeNotificationData(data);
    }
  }, [authenticatedUser]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
