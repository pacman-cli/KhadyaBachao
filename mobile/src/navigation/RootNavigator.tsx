import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
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
import {useAuthStore} from '../store/authStore';

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
  const {initializing, token, awaitingRoleSelection, bootstrap} =
    useAuthStore();

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
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PostFood" component={PostFoodScreen} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />
        <Stack.Screen name="Discover" component={DiscoverScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="MyClaims" component={MyClaimsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>{content}</Stack.Navigator>
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
