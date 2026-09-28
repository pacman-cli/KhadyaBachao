import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {
  absoluteUrl,
  getListing,
  type Listing,
} from '../../api/listings';
import {claimListing} from '../../api/requests';
import {ROLE_LABELS} from '../../api/types';
import {useListingEvents} from '../../hooks/useListingEvents';
import type {ListingEvent} from '../../api/wsClient';
import {ReportModal} from '../../components/ReportModal';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {Badge} from '../../components/Badge';
import {LoadingState} from '../../components/LoadingState';
import {ErrorState} from '../../components/ErrorState';
import {formatDateTime} from '../../utils/datetime';

type Props = NativeStackScreenProps<RootStackParamList, 'ListingDetail'>;

export function ListingDetailScreen({route, navigation}: Props) {
  const {listingId} = route.params;
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reporting, setReporting] = useState(false);

  const fetchDetail = useCallback(() => {
    // Clear any previous failure first — otherwise a successful retry keeps
    // rendering the ErrorState because the gate checks `error` before data.
    setError(null);
    getListing(listingId)
      .then(setListing)
      .catch(e =>
        setError(e?.response?.data?.detail ?? 'Could not load listing details'),
      );
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  useListingEvents(
    useCallback(
      (_event: ListingEvent) => {
        getListing(listingId).then(setListing).catch(() => {});
      },
      [listingId],
    ),
    listingId,
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Listing Details" showBack onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Listing Details" showBack onBack={() => navigation.goBack()} />
        <LoadingState message="Loading listing details..." />
      </SafeAreaView>
    );
  }

  async function claim() {
    setClaiming(true);
    // Optimistic UI update: mark status as CLAIMED locally while API call processes
    setListing(prev => (prev ? {...prev, status: 'CLAIMED'} : null));
    try {
      await claimListing(listingId);
      Alert.alert(
        'Claim Successful! 🎉',
        'The donor has been notified. You can track this under "My Claims".',
      );
      setListing(await getListing(listingId));
    } catch (e) {
      const err = e as {response?: {status?: number; data?: {detail?: string}}};
      const isConflict = err.response?.status === 409;
      const detail = isConflict
        ? 'This item was just claimed by someone else.'
        : (err.response?.data?.detail ?? 'Could not claim this listing');

      Alert.alert(isConflict ? 'Already Claimed ⚠️' : 'Cannot Claim', detail);
      try {
        setListing(await getListing(listingId));
      } catch {
        // silent catch if listing is gone
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Listing Details"
        subtitle={listing.title}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery Carousel */}
        {listing.photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photosScroll}>
            {listing.photoUrls.map((url, i) => (
              <Image
                key={i}
                source={{uri: absoluteUrl(url)}}
                style={styles.photo}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>{listing.title}</Text>
            <Badge label={listing.status} variant={listing.status} />
          </View>

          {listing.description ? (
            <Text style={styles.description}>{listing.description}</Text>
          ) : null}

          <View style={styles.factsGrid}>
            <Fact label="Quantity" value={`${Number(listing.quantityValue)} ${listing.quantityUnit}`} icon="📦" />
            <Fact label="Food Type" value={listing.foodType} icon="🍲" />
            <Fact
              label="Pickup Deadline"
              value={formatDateTime(listing.pickupDeadline)}
              icon="⏰"
            />
            {listing.pickupAddress ? (
              <Fact label="Address" value={listing.pickupAddress} icon="📍" />
            ) : (
              <Fact
                label="Coordinates"
                value={`${listing.pickupLat.toFixed(4)}, ${listing.pickupLng.toFixed(4)}`}
                icon="📍"
              />
            )}
          </View>
        </View>

        {/* Donor Profile Card */}
        <View style={styles.donorCard}>
          <View style={styles.donorAvatar}>
            <Text style={styles.donorAvatarText}>
              {listing.donorName ? listing.donorName.charAt(0).toUpperCase() : '🏪'}
            </Text>
          </View>
          <View style={styles.donorInfo}>
            <Text style={styles.donorName}>
              {listing.donorName ?? 'Donor'}
              {listing.donorVerified ? ' ✓' : ''}
            </Text>
            <Text style={styles.donorMeta}>
              {listing.donorRole ? ROLE_LABELS[listing.donorRole] : 'Food Donor'}
              {listing.donorVerified ? ' · Verified Partner' : ' · Community Donor'}
            </Text>
          </View>
        </View>

        {/* Claim Action */}
        {listing.status === 'AVAILABLE' ? (
          <AppButton
            title="Claim This Surplus Food"
            variant="primary"
            size="lg"
            loading={claiming}
            onPress={claim}
            style={styles.claimButton}
          />
        ) : (
          <View style={styles.unavailableBox}>
            <Text style={styles.unavailableText}>
              This food item is no longer available for claiming ({(listing.status as string).toLowerCase()}).
            </Text>
          </View>
        )}

        {/* Report Listing Link */}
        <Pressable
          style={styles.reportLink}
          onPress={() => setReporting(true)}>
          <Text style={styles.reportLinkText}>⚠️ Report suspicious listing</Text>
        </Pressable>

        {reporting && (
          <ReportModal targetId={listing.id} onClose={() => setReporting(false)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({label, value, icon}: {label: string; value: string; icon: string}) {
  return (
    <View style={styles.factItem}>
      <Text style={styles.factIcon}>{icon}</Text>
      <View style={styles.factTextGroup}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
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
    gap: spacing.lg,
    paddingBottom: spacing.massive,
  },
  photosScroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  photo: {
    width: 240,
    height: 160,
    borderRadius: radius.lg,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  factsGrid: {
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  factIcon: {
    fontSize: 20,
  },
  factTextGroup: {
    flex: 1,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  factValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  donorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donorAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  donorMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  claimButton: {
    marginTop: spacing.xs,
  },
  unavailableBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  unavailableText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportLink: {
    alignSelf: 'center',
    // Destructive action — generous tap target.
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  reportLinkText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
