import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {useAuthStore} from '../store/authStore';
import {ROLE_LABELS} from '../api/types';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {radius} from '../theme/radius';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const user = useAuthStore(state => state.user);
  const isDonor = user?.role === 'DONOR';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>Khadya Bachao</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user ? ROLE_LABELS[user.role] : 'Guest'}
            </Text>
          </View>
        </View>
        <Pressable
          style={({pressed}) => [styles.profileAvatar, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Profile')}
          accessibilityLabel="Open Profile"
          accessibilityRole="button">
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.greeting}>
            Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
          </Text>
          <Text style={styles.tagline}>
            {isDonor
              ? 'Share surplus food with your community today.'
              : 'Rescue available surplus food near you.'}
          </Text>
        </View>

        {/* Primary Action Card */}
        {isDonor ? (
          <Pressable
            style={({pressed}) => [styles.mainCard, pressed && styles.pressed]}
            onPress={() => navigation.navigate('PostFood')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, {backgroundColor: colors.primaryLight}]}>
                <Text style={styles.cardIcon}>🍲</Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </View>
            <Text style={styles.mainCardTitle}>Post Surplus Food</Text>
            <Text style={styles.mainCardDesc}>
              Share extra meals or produce before it goes to waste
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({pressed}) => [styles.mainCard, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Discover')}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, {backgroundColor: colors.primaryLight}]}>
                <Text style={styles.cardIcon}>📍</Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </View>
            <Text style={styles.mainCardTitle}>Find Food Near Me</Text>
            <Text style={styles.mainCardDesc}>
              Browse interactive map and list for free surplus food nearby
            </Text>
          </Pressable>
        )}

        {/* Impact Highlights */}
        <Pressable
          style={({pressed}) => [styles.impactCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Dashboard')}>
          <View style={styles.impactLeft}>
            <Text style={styles.impactIcon}>🌱</Text>
            <View style={styles.impactTextGroup}>
              <Text style={styles.impactTitle}>Community Impact</Text>
              <Text style={styles.impactDesc}>
                Track meals saved, CO₂ reduced & stats
              </Text>
            </View>
          </View>
          <Text style={styles.impactArrow}>→</Text>
        </Pressable>

        {/* Secondary Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {isDonor ? (
            <>
              <Pressable
                style={({pressed}) => [styles.gridCard, pressed && styles.pressed]}
                onPress={() => navigation.navigate('MyListings')}>
                <Text style={styles.gridIcon}>📦</Text>
                <Text style={styles.gridTitle}>My Listings</Text>
                <Text style={styles.gridDesc}>Manage your active food posts</Text>
              </Pressable>

              <Pressable
                style={({pressed}) => [styles.gridCard, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Discover')}>
                <Text style={styles.gridIcon}>🗺️</Text>
                <Text style={styles.gridTitle}>Browse Map</Text>
                <Text style={styles.gridDesc}>See nearby food rescue activity</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={({pressed}) => [styles.gridCard, pressed && styles.pressed]}
                onPress={() => navigation.navigate('MyClaims')}>
                <Text style={styles.gridIcon}>📋</Text>
                <Text style={styles.gridTitle}>My Claims</Text>
                <Text style={styles.gridDesc}>Track food items you claimed</Text>
              </Pressable>

              <Pressable
                style={({pressed}) => [styles.gridCard, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Discover')}>
                <Text style={styles.gridIcon}>🔍</Text>
                <Text style={styles.gridTitle}>Discover</Text>
                <Text style={styles.gridDesc}>Filter food by type & distance</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Admin Console Card if Admin */}
        {isAdmin ? (
          <Pressable
            style={({pressed}) => [styles.adminCard, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Admin')}>
            <View style={styles.adminLeft}>
              <Text style={styles.adminIcon}>🛡️</Text>
              <View>
                <Text style={styles.adminTitle}>Admin Console</Text>
                <Text style={styles.adminDesc}>
                  Reports queue, org verifications & platform analytics
                </Text>
              </View>
            </View>
            <Text style={styles.adminArrow}>→</Text>
          </Pressable>
        ) : null}

        {/* Profile & Settings Banner */}
        <Pressable
          style={({pressed}) => [styles.profileBanner, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileLeft}>
            <Text style={styles.profileIcon}>⚙️</Text>
            <Text style={styles.profileTitle}>Profile & Preferences</Text>
          </View>
          <Text style={styles.profileArrow}>→</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  welcomeBanner: {
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  mainCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 22,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mainCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mainCardDesc: {
    fontSize: 14,
    color: '#E6F4EA',
    lineHeight: 20,
  },
  impactCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  impactIcon: {
    fontSize: 24,
  },
  impactTextGroup: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  impactDesc: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  impactArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  gridIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  gridDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  adminCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  adminIcon: {
    fontSize: 24,
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  adminArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileIcon: {
    fontSize: 18,
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  profileArrow: {
    fontSize: 16,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.99}],
  },
});
