import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {useAuthStore} from '../../store/authStore';
import {ROLE_LABELS, SELECTABLE_ROLES, type UserRole} from '../../api/types';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  DONOR: 'Restaurants, shops or individuals with surplus food to give away.',
  RECIPIENT_NGO: 'NGOs and charities collecting food for communities.',
  RECIPIENT_INDIVIDUAL: 'Individuals picking up free surplus food nearby.',
  VOLUNTEER: 'Help coordinate and deliver rescued food.',
  ADMIN: 'Platform administration.',
};

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

export function RoleSelectScreen({navigation}: Props) {
  const {selectRole, loading, error} = useAuthStore();

  async function choose(role: UserRole) {
    const ok = await selectRole(role);
    if (ok) {
      navigation.replace('Home');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Who are you?</Text>
      <Text style={styles.subtitle}>
        Pick your role so we can tailor the app for you.
      </Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {SELECTABLE_ROLES.map(role => (
          <Pressable
            key={role}
            style={styles.card}
            disabled={loading}
            onPress={() => choose(role)}>
            <View>
              <Text style={styles.cardTitle}>{ROLE_LABELS[role]}</Text>
              <Text style={styles.cardDesc}>{ROLE_DESCRIPTIONS[role]}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 14,
    padding: 18,
    backgroundColor: '#fafafa',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0b7a3e',
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  spinner: {
    marginVertical: 8,
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
});
