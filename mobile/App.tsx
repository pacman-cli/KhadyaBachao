import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from './src/navigation/RootNavigator';
import {setOnAuthFailure} from './src/api/client';
import {useAuthStore} from './src/store/authStore';

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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
