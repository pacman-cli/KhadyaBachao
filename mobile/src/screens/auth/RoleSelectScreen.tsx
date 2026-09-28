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
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';

const ROLE_ICONS: Record<UserRole, string> = {
  DONOR: '🏢',
  RECIPIENT_NGO: '🏛️',
  RECIPIENT_INDIVIDUAL: '🙋‍♂️',
  VOLUNTEER: '🤝',
  ADMIN: '🛡️',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  DONOR: 'Restaurants, grocery stores or individuals sharing extra food.',
  RECIPIENT_NGO: 'NGOs, shelters & organizations distributing food to communities.',
  RECIPIENT_INDIVIDUAL: 'Individuals picking up surplus food nearby.',
  VOLUNTEER: 'Help pick up, transport and deliver rescued food.',
  ADMIN: 'Platform administration & moderation.',
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
      <AppHeader
        title="Select Your Role"
        subtitle="Customizes your experience in Khadya Bachao"
      />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {SELECTABLE_ROLES.map(role => (
          <Pressable
            key={role}
            style={({pressed}) => [styles.card, pressed && styles.pressed]}
            disabled={loading}
            onPress={() => choose(role)}>
            <View style={styles.iconBox}>
              <Text style={styles.roleIcon}>{ROLE_ICONS[role]}</Text>
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.cardTitle}>{ROLE_LABELS[role]}</Text>
              <Text style={styles.cardDesc}>{ROLE_DESCRIPTIONS[role]}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingFooter}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Updating role...</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    transform: [{scale: 0.99}],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 22,
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    paddingBottom: spacing.lg,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});
