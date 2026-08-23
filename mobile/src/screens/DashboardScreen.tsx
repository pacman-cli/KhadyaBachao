import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  fetchMyStats,
  fetchSystemStats,
  type MyStats,
  type SystemStats,
} from '../api/stats';

export function DashboardScreen() {
  const [mine, setMine] = useState<MyStats | null>(null);
  const [system, setSystem] = useState<SystemStats | null>(null);

  useEffect(() => {
    fetchMyStats().then(setMine).catch(() => {});
    fetchSystemStats().then(setSystem).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Impact</Text>

        {mine && (
          <>
            <Text style={styles.sectionTitle}>Your impact</Text>
            <View style={styles.grid}>
              {mine.role === 'DONOR' ? (
                <>
                  <Stat label="Listings posted" value={mine.listingsPosted} />
                  <Stat label="Pickups completed" value={mine.pickupsCompleted} />
                  <Stat
                    label="Food rescued"
                    value={fmt(mine.quantityRescued)}
                  />
                </>
              ) : (
                <>
                  <Stat label="Claims made" value={mine.claimsMade} />
                  <Stat label="Pickups received" value={mine.pickupsCompleted} />
                  <Stat
                    label="Food received"
                    value={fmt(mine.quantityRescued)}
                  />
                </>
              )}
            </View>
          </>
        )}

        {system && (
          <>
            <Text style={styles.sectionTitle}>Community impact</Text>
            <View style={styles.grid}>
              <Stat label="Total listings" value={system.totalListings} />
              <Stat label="Completed pickups" value={system.completedPickups} />
              <Stat label="Total rescued" value={fmt(system.totalRescued)} />
            </View>

            {system.daily.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rescued — last {Math.min(system.daily.length, 14)} days</Text>
                <BarChart data={[...system.daily].reverse()} />
              </View>
            )}

            {system.leaderboard.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top rescuers</Text>
                {system.leaderboard.map((entry, i) => (
                  <View key={i} style={styles.leaderRow}>
                    <Text style={styles.rank}>#{i + 1}</Text>
                    <Text style={styles.leaderName}>{entry.donorName}</Text>
                    <Text style={styles.leaderValue}>
                      {fmt(entry.totalRescued)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({label, value}: {label: string; value: string | number}) {
  return (
    <View style={styles.statCard}>
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
                {height: Math.max(3, (d.rescued / max) * 80)},
              ]}
            />
          </View>
          <Text style={styles.barLabel}>
            {new Date(d.date).getDate()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
    marginTop: 8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f2faf5',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0b7a3e',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#557',
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginBottom: 12,
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
    backgroundColor: '#0b7a3e',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rank: {
    width: 34,
    fontWeight: '800',
    color: '#f1a805',
  },
  leaderName: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  leaderValue: {
    fontWeight: '700',
    color: '#0b7a3e',
  },
});
