import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {
  fetchMyStats,
  fetchSystemStats,
  type MyStats,
  type SystemStats,
} from '../api/stats';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {radius} from '../theme/radius';
import {AppHeader} from '../components/AppHeader';
import {ErrorState} from '../components/ErrorState';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({navigation}: Props) {
  const [mine, setMine] = useState<MyStats | null>(null);
  const [system, setSystem] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    // A dashboard with no loading/error states rendered a permanent blank
    // screen on failure (live finding) — both are now explicit.
    Promise.all([fetchMyStats(), fetchSystemStats()])
      .then(([m, s]) => {
        setMine(m);
        setSystem(s);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Impact & Analytics"
        subtitle="Track food rescued and environmental contribution"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }>
        {failed && !loading && (
          <ErrorState
            message="Could not load impact stats."
            onRetry={load}
          />
        )}
        {mine && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌱 Your Personal Impact</Text>
            <View style={styles.grid}>
              {mine.role === 'DONOR' ? (
                <>
                  <Stat label="Listings Posted" value={mine.listingsPosted} icon="📦" />
                  <Stat label="Pickups Completed" value={mine.pickupsCompleted} icon="✓" />
                  <Stat label="Food Rescued" value={fmt(mine.quantityRescued)} icon="🍲" />
                </>
              ) : (
                <>
                  <Stat label="Claims Made" value={mine.claimsMade} icon="📋" />
                  <Stat label="Pickups Received" value={mine.pickupsCompleted} icon="✓" />
                  <Stat label="Food Received" value={fmt(mine.quantityRescued)} icon="🍲" />
                </>
              )}
            </View>
          </View>
        )}

        {system && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌍 Community Impact</Text>
            <View style={styles.grid}>
              <Stat label="Total Listings" value={system.totalListings} icon="📦" />
              <Stat label="Completed Pickups" value={system.completedPickups} icon="🤝" />
              <Stat label="Total Rescued" value={fmt(system.totalRescued)} icon="✨" />
            </View>

            {system.daily.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Daily Rescue Activity (Last {Math.min(system.daily.length, 14)} Days)
                </Text>
                <BarChart data={[...system.daily].reverse()} />
              </View>
            )}

            {system.leaderboard.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏆 Community Leaderboard</Text>
                {system.leaderboard.map((entry, i) => (
                  <View key={i} style={styles.leaderRow}>
                    <Text style={styles.rank}>#{i + 1}</Text>
                    <Text style={styles.leaderName}>{entry.donorName}</Text>
                    <Text style={styles.leaderValue}>
                      {fmt(entry.totalRescued)} items
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({label, value, icon}: {label: string; value: string | number; icon: string}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function fmt(n: number): string {
  return Number(n) % 1 === 0 ? String(Number(n)) : Number(n).toFixed(1);
}

function BarChart({data}: {data: {date: string; rescued: number}[]}) {
  const max = Math.max(...data.map(d => d.rescued), 1);
  return (
    <View style={styles.chartRow}>
      {data.map(d => (
        <View key={d.date} style={styles.chartCol}>
          <View style={styles.barWrap}>
            <View
              style={[
                styles.bar,
                {height: Math.max(4, (d.rescued / max) * 80)},
              ]}
            />
          </View>
          <Text style={styles.barLabel}>
            {/* d.date is a date-only string ("2026-09-27"); Date parsing shifts
                it a day in UTC-negative timezones — slice the day directly. */}
            {Number(d.date.slice(-2))}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 104,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrap: {
    height: 84,
    justifyContent: 'flex-end',
    width: '70%',
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 32,
    fontSize: 14,
    fontWeight: '800',
    color: colors.warning,
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  leaderValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
