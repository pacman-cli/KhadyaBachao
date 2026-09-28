import React, {useCallback, useState} from 'react';
import {
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
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
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
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {LoadingState} from '../../components/LoadingState';
import {EmptyState} from '../../components/EmptyState';

type Tab = 'reports' | 'verifications';
type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

export function AdminScreen({navigation}: Props) {
  const [tab, setTab] = useState<Tab>('reports');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      setLoadError(null);
    } catch (e: any) {
      // Without this a transient failure rendered an empty "all clean" queue.
      setLoadError(e?.response?.data?.detail ?? 'Could not load the admin queue');
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
    Alert.alert(title, 'Are you sure you want to perform this admin action?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Yes, Confirm',
        style: 'destructive',
        onPress: () =>
          action()
            .then(load)
            .catch((e: any) =>
              Alert.alert(
                'Error',
                e?.response?.data?.detail ?? 'The admin action failed',
              ),
            ),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Admin Console"
        subtitle="Platform moderation & verifications queue"
        showBack
        onBack={() => navigation.goBack()}
      />

      {loadError && (
        <Text style={styles.loadError}>
          ⚠️ {loadError} — pull down or reopen to retry.
        </Text>
      )}

      {metrics && (
        <View style={styles.metricsRow}>
          <Metric label="Open Reports" value={metrics.openReports} icon="⚠️" />
          <Metric label="Pending Verif." value={metrics.pendingVerifications} icon="⏳" />
          <Metric
            label="Total Users"
            value={metrics.usersByRole.reduce((s, [, n]) => s + n, 0)}
            icon="👥"
          />
          <Metric
            label="Listings"
            value={metrics.listingsByStatus.reduce((s, [, n]) => s + n, 0)}
            icon="📦"
          />
        </View>
      )}

      {/* Segment Tab Controls */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'reports' && styles.tabActive]}
          onPress={() => setTab('reports')}>
          <Text style={[styles.tabText, tab === 'reports' && styles.tabTextActive]}>
            Open Reports ({reports.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'verifications' && styles.tabActive]}
          onPress={() => setTab('verifications')}>
          <Text
            style={[
              styles.tabText,
              tab === 'verifications' && styles.tabTextActive,
            ]}>
            Pending Verifications ({verifications.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState message="Loading moderation data..." />
      ) : tab === 'reports' ? (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="All Clean!"
              message="There are no pending user reports in the queue."
            />
          }
          renderItem={({item}) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.targetBadge}>
                  {item.targetType === 'LISTING' ? '📦 Listing Report' : '👤 User Report'}
                </Text>
                <Text style={styles.reporterText}>by {item.reporterName}</Text>
              </View>

              <Text style={styles.reasonText}>"{item.reason}"</Text>

              <View style={styles.actionsRow}>
                <AppButton
                  title="Take Down & Resolve"
                  variant="danger"
                  size="sm"
                  style={{flex: 1}}
                  onPress={() =>
                    confirmAction('Resolve Report & Take Down', () =>
                      resolveReport(item.id),
                    )
                  }
                />
                <AppButton
                  title="Dismiss"
                  variant="outline"
                  size="sm"
                  style={{flex: 1}}
                  onPress={() =>
                    confirmAction('Dismiss Report', () => dismissReport(item.id))
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
            <EmptyState
              title="No Pending Verifications"
              message="All organization verification applications have been reviewed."
            />
          }
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.orgTitle}>{item.orgName}</Text>
              <Text style={styles.orgMeta}>
                Applicant: {item.userName}
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
                <AppButton
                  title="✓ Approve Verification"
                  variant="primary"
                  size="sm"
                  style={{flex: 1}}
                  onPress={() =>
                    confirmAction('Approve Organization Verification?', () =>
                      approveVerification(item.id),
                    )
                  }
                />
                <AppButton
                  title="Reject"
                  variant="danger"
                  size="sm"
                  style={{flex: 0.8}}
                  onPress={() =>
                    confirmAction('Reject Verification Application?', () =>
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

function Metric({label, value, icon}: {label: string; value: string | number; icon: string}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{String(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  reporterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reasonText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 4,
  },
  orgTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  orgMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  docImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
