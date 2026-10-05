import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
  const {selectRole, loading, error, awaitingRoleSelection, user} =
    useAuthStore();
  const [submittingRole, setSubmittingRole] = useState<UserRole | null>(null);
  const submitLock = useRef(false);

  // First-login onboarding: hardware back must not silently skip role
  // selection — bootstrap never re-asks, so the user would land on a
  // recipient home they never chose. (Opened via Profile → Change Role, back
  // is a legitimate cancel and stays enabled.)
  useEffect(() => {
    if (!awaitingRoleSelection) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [awaitingRoleSelection]);

  async function choose(role: UserRole) {
    // Maintainer accounts are server-enforced too — the API returns 403 for
    // admins; this keeps the UI from even attempting it.
    if (submitLock.current || user?.role === 'ADMIN') {
      return;
    }
    submitLock.current = true;
    setSubmittingRole(role);
    const ok = await selectRole(role);
    submitLock.current = false;
    setSubmittingRole(null);
    if (!ok) {
      return;
    }
    // The user may have pressed hardware back while the request was in flight
    // (Change-Role flow pops to Profile) — navigating from a popped screen
    // would yank them out of wherever they are now.
    if (!navigation.isFocused()) {
      return;
    }
    if (awaitingRoleSelection) {
      // Initial onboarding: there is nothing beneath this screen to pop to.
      navigation.replace('Home');
    } else {
      // Change-Role flow: [Home, Profile, RoleSelect] — goBack returns to
      // Profile, which re-renders with the updated role (no [Home, Home]).
      navigation.goBack();
    }
  }

  const busy = loading || submittingRole !== null;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Select Your Role"
        subtitle={
          awaitingRoleSelection
            ? 'Customizes your experience in Khadya Bachao'
            : `Current: ${user ? ROLE_LABELS[user.role] : 'Guest'} — pick a new role`
        }
      />

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        {user?.role === 'ADMIN' ? (
          <View style={styles.adminLockBox}>
            <Text style={styles.adminLockTitle}>🛡️ Maintainer Account</Text>
            <Text style={styles.adminLockDesc}>
              You administer the platform. Admin accounts cannot switch roles.
            </Text>
          </View>
        ) : null}
        {SELECTABLE_ROLES.map(role => (
          <Pressable
            key={role}
            style={({pressed}) => [
              styles.card,
              pressed && styles.pressed,
              submittingRole === role && styles.pressed,
              user?.role === 'ADMIN' && styles.cardLocked,
            ]}
            disabled={busy || user?.role === 'ADMIN'}
            onPress={() => choose(role)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${ROLE_LABELS[role]} role`}
            accessibilityState={{selected: user?.role === role}}>
            <View style={styles.iconBox}>
              <Text style={styles.roleIcon}>{ROLE_ICONS[role]}</Text>
            </View>
            <View style={styles.cardTextGroup}>
              <Text style={styles.cardTitle}>{ROLE_LABELS[role]}</Text>
              <Text style={styles.cardDesc}>{ROLE_DESCRIPTIONS[role]}</Text>
            </View>
            {user?.role === role ? (
              <Text style={styles.currentTag}>✓</Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {busy ? (
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
  currentTag: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
  },
  adminLockBox: {
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  adminLockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
  },
  adminLockDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardLocked: {
    opacity: 0.55,
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
