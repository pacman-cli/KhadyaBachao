import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RoleSelectScreen} from '../screens/auth/RoleSelectScreen';
import {ProfileScreen} from '../screens/auth/ProfileScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {PostFoodScreen} from '../screens/donor/PostFoodScreen';
import {MyListingsScreen} from '../screens/donor/MyListingsScreen';
import {DiscoverScreen} from '../screens/receiver/DiscoverScreen';
import {ListingDetailScreen} from '../screens/receiver/ListingDetailScreen';
import {MyClaimsScreen} from '../screens/receiver/MyClaimsScreen';
import {ChatScreen} from '../screens/chat/ChatScreen';
import {DashboardScreen} from '../screens/DashboardScreen';
import {AdminScreen} from '../screens/admin/AdminScreen';
import {NotificationsScreen} from '../screens/notifications/NotificationsScreen';
import {useAuthStore} from '../store/authStore';

/**
 * Ref used by notification tap handlers (utils/notifications.ts) to deep-link
 * into the screen matching the pushed event's data payload.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type RootStackParamList = {
  Login: undefined;
  RoleSelect: undefined;
  Profile: undefined;
  Home: undefined;
  PostFood: undefined;
  MyListings: undefined;
  Discover: undefined;
  ListingDetail: {listingId: string};
  MyClaims: undefined;
  Chat: {requestId: string; title?: string};
  Dashboard: undefined;
  Admin: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function BootSplash() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator size="large" color="#0b7a3e" />
    </View>
  );
}

export function RootNavigator() {
  // Select only the fields the routing decision needs — subscribing to the
  // whole store re-renders the entire navigator tree on every store mutation
  // (e.g. while the user types in a login form).
  const initializing = useAuthStore(state => state.initializing);
  const token = useAuthStore(state => state.token);
  const awaitingRoleSelection = useAuthStore(
    state => state.awaitingRoleSelection,
  );
  const bootstrap = useAuthStore(state => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (initializing) {
    return <BootSplash />;
  }

  let content;
  if (!token) {
    content = <Stack.Screen name="Login" component={LoginScreen} />;
  } else if (awaitingRoleSelection) {
    content = <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />;
  } else {
    content = (
      <>
        <Stack.Screen name="Home" component={HomeScreen} />
        {/* Registered here too: Profile's "Change Role" replaces onto
            RoleSelect, which previously threw "action REPLACE not handled"
            because it only existed in the awaitingRoleSelection branch. */}
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PostFood" component={PostFoodScreen} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />
        <Stack.Screen name="Discover" component={DiscoverScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="MyClaims" component={MyClaimsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Every screen renders its own branded header inside a SafeAreaView;
          the default native header would duplicate it and leave a dead gap
          between the two bars. */}
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {content}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
