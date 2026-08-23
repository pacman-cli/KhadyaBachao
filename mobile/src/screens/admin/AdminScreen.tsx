import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {
  approveVerification,
  dismissReport,
  fetchMetrics,
  fetchReports,
  fetchVerifications,
  rejectVerification,
  resolveReport,
  type AdminReport,
  type Metrics,
} from '../../api/admin';
import type {Verification} from '../../api/verification';
import {absoluteUrl} from '../../api/listings';

type Tab = 'reports' | 'verifications';

export function AdminScreen() {
  const [tab, setTab] = useState<Tab>('reports');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, v, m] = await Promise.all([
        fetchReports('OPEN'),
        fetchVerifications('PENDING'),
        fetchMetrics().catch(() => null),
      ]);
      setReports(r);
      setVerifications(v);
      setMetrics(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmAction(title: string, action: () => Promise<void>) {
    Alert.alert(title, 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Yes', style: 'destructive', onPress: () => action().then(load)},
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Admin console</Text>

      {metrics && (
        <View style={styles.metricsRow}>
          <Metric label="Open reports" value={metrics.openReports} />
          <Metric label="Pending verif." value={metrics.pendingVerifications} />
          <Metric
            label="Users"
            value={metrics.usersByRole.reduce((s, [, n]) => s + n, 0)}
          />
          <Metric
            label="Listings"
            value={metrics.listingsByStatus.reduce((s, [, n]) => s + n, 0)}
          />
        </View>
      )}

      <View style={styles.tabs}>
        <TabButton label={`Reports (${reports.length})`} active={tab === 'reports'} onPress={() => setTab('reports')} />
        <TabButton label={`Verifications (${verifications.length})`} active={tab === 'verifications'} onPress={() => setTab('verifications')} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} size="large" color="#0b7a3e" />
      ) : tab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No open reports.</Text>}
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.targetType === 'LISTING' ? 'Listing' : 'User'} reported by{' '}
                {item.reporterName}
              </Text>
              <Text style={styles.reason}>"{item.reason}"</Text>
              <View style={styles.actionsRow}>
                <ActionButton
                  label="Take down & resolve"
                  danger
                  onPress={() =>
                    confirmAction('Resolve report (takes listing down)', () =>
                      resolveReport(item.id),
                    )
                  }
                />
                <ActionButton
                  label="Dismiss"
                  onPress={() =>
                    confirmAction('Dismiss report', () => dismissReport(item.id))
                  }
                />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={verifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No pending verifications.</Text>
          }
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.orgName}</Text>
              <Text style={styles.reason}>
                {item.userName}
                {item.orgType ? ` · ${item.orgType}` : ''}
              </Text>
              {item.registrationDocUrl ? (
                <Image
                  source={{uri: absoluteUrl(item.registrationDocUrl)}}
                  style={styles.docImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.actionsRow}>
                <ActionButton
                  label="Approve"
                  success
                  onPress={() =>
                    confirmAction('Approve organization?', () =>
                      approveVerification(item.id),
                    )
                  }
                />
                <ActionButton
                  label="Reject"
                  danger
                  onPress={() =>
                    confirmAction('Reject verification?', () =>
                      rejectVerification(item.id),
                    )
                  }
                />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Metric({label, value}: {label: string; value: string | number}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{String(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TabButton({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <Pressable
      style={[styles.tabButton, active && styles.tabActive]}
      onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({label, onPress, danger, success}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionBtn,
        danger && styles.actionDanger,
        success && styles.actionSuccess,
      ]}
      onPress={onPress}>
      <Text style={[styles.actionBtnText, (danger || success) && styles.actionBtnTextColored]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  metric: {
    flex: 1,
    backgroundColor: '#f2faf5',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b7a3e',
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#0b7a3e',
    borderColor: '#0b7a3e',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: {
    padding: 20,
    paddingTop: 4,
    gap: 12,
  },
  spinner: {
    marginTop: 30,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reason: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  docImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#eee',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionDanger: {
    borderColor: '#c0392b',
  },
  actionSuccess: {
    borderColor: '#0b7a3e',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
  },
  actionBtnTextColored: {},
});
