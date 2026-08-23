import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {useAuthStore} from '../store/authStore';
import {ROLE_LABELS} from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const user = useAuthStore(state => state.user);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hello}>
          Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </Text>
        <Text style={styles.role}>{user ? ROLE_LABELS[user.role] : ''}</Text>

        {user?.role !== 'DONOR' && (
          <>
            <Pressable
              style={[styles.action, styles.primary]}
              onPress={() => navigation.navigate('Discover')}>
              <Text style={[styles.actionTitle, styles.primaryText]}>
                Find food near me
              </Text>
              <Text style={[styles.actionDesc, styles.primaryText]}>
                Browse the map for available surplus food
              </Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() => navigation.navigate('MyClaims')}>
              <Text style={styles.actionTitle}>My claims</Text>
              <Text style={styles.actionDesc}>
                Track the food you've claimed
              </Text>
            </Pressable>
          </>
        )}

        {user?.role === 'ADMIN' && (
          <Pressable
            style={[styles.action, styles.adminAction]}
            onPress={() => navigation.navigate('Admin')}>
            <Text style={[styles.actionTitle, styles.primaryText]}>
              Admin console
            </Text>
            <Text style={[styles.actionDesc, styles.primaryText]}>
              Reports queue, verifications & metrics
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.action, styles.impact]}
          onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.impactTitle}>🌱 My impact</Text>
          <Text style={styles.impactDesc}>
            See food rescued by you and the community
          </Text>
        </Pressable>

        {user?.role === 'DONOR' && (
          <>
            <Pressable
              style={[styles.action, styles.primary]}
              onPress={() => navigation.navigate('PostFood')}>
              <Text style={[styles.actionTitle, styles.primaryText]}>
                Post surplus food
              </Text>
              <Text style={[styles.actionDesc, styles.primaryText]}>
                Share extra food before it goes to waste
              </Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() => navigation.navigate('MyListings')}>
              <Text style={styles.actionTitle}>My listings</Text>
              <Text style={styles.actionDesc}>
                Track status of what you posted
              </Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() => navigation.navigate('Discover')}>
              <Text style={styles.actionTitle}>Browse map</Text>
              <Text style={styles.actionDesc}>See what's being rescued nearby</Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={[styles.action, styles.subtle]}
          onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.actionTitle}>Profile & settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  hello: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 12,
  },
  role: {
    fontSize: 14,
    color: '#0b7a3e',
    fontWeight: '700',
    marginBottom: 12,
  },
  action: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#fafafa',
  },
  primary: {
    backgroundColor: '#0b7a3e',
    borderColor: '#0b7a3e',
  },
  subtle: {
    paddingVertical: 14,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  primaryText: {
    color: '#fff',
  },
  actionDesc: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.8,
  },
  impact: {
    backgroundColor: '#e6f6ec',
    borderColor: '#bfe5cd',
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b7a3e',
  },
  impactDesc: {
    marginTop: 4,
    fontSize: 13,
    color: '#3f6d51',
  },
  adminAction: {
    backgroundColor: '#1f2937',
    borderColor: '#1f2937',
  },
  comingSoon: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 30,
  },
});
