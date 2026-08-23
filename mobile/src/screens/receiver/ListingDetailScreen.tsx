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

type Props = NativeStackScreenProps<RootStackParamList, 'ListingDetail'>;

export function ListingDetailScreen({route}: Props) {
  const {listingId} = route.params;
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getListing(listingId)
        .then(setListing)
        .catch(e =>
          setError(e?.response?.data?.detail ?? 'Could not load listing'),
        );
    }, [listingId]),
  );

  // live updates: someone claimed/completed this listing while viewing it
  useListingEvents(
    useCallback(
      (_event: ListingEvent) => {
        getListing(listingId).then(setListing).catch(() => {});
      },
      [listingId],
    ),
    listingId,
  );

  const [claiming, setClaiming] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  }
  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.meta}>Loading…</Text>
      </SafeAreaView>
    );
  }

  async function claim() {
    setClaiming(true);
    try {
      await claimListing(listingId);
      Alert.alert(
        'Claimed!',
        'The donor has been notified. Find it under "My claims".',
      );
      setListing(await getListing(listingId));
    } catch (e) {
      const detail =
        (e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ??
        'Could not claim this listing';
      Alert.alert('Cannot claim', detail);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {listing.photoUrls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photos}>
            {listing.photoUrls.map((url, i) => (
              <Image
                key={i}
                source={{uri: absoluteUrl(url)}}
                style={styles.photo}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.rowBetween}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={[styles.badge, styles.badgeAvailable]}>
            <Text style={[styles.badgeText, styles.badgeTextAvailable]}>
              {listing.status}
            </Text>
          </View>
        </View>

        {listing.description ? (
          <Text style={styles.description}>{listing.description}</Text>
        ) : null}

        <View style={styles.facts}>
          <Fact label="Quantity" value={`${Number(listing.quantityValue)} ${listing.quantityUnit}`} />
          <Fact label="Food type" value={listing.foodType.toLowerCase()} />
          <Fact
            label="Pickup by"
            value={new Date(listing.pickupDeadline).toLocaleString()}
          />
          {listing.pickupAddress ? (
            <Fact label="Address" value={listing.pickupAddress} />
          ) : (
            <Fact
              label="Location"
              value={`${listing.pickupLat.toFixed(4)}, ${listing.pickupLng.toFixed(4)}`}
            />
          )}
        </View>

        <View style={styles.donorCard}>
          <View>
            <Text style={styles.donorName}>
              {listing.donorName ?? 'Donor'}
              {listing.donorVerified ? ' ✓' : ''}
            </Text>
            <Text style={styles.donorMeta}>
              {listing.donorRole ? ROLE_LABELS[listing.donorRole] : ''}
              {listing.donorRole ? ' · ' : ''}
              {listing.donorVerified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>

        {listing.status === 'AVAILABLE' ? (
          <Pressable
            style={[styles.claimButton, claiming && styles.buttonDisabled]}
            disabled={claiming}
            onPress={claim}>
            <Text style={styles.claimButtonText}>
              {claiming ? 'Claiming…' : 'Claim this food'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.unavailableNote}>
            This listing is no longer available for claiming.
          </Text>
        )}

        <Pressable
          style={styles.reportLink}
          onPress={() => setReporting(true)}>
          <Text style={styles.reportLinkText}>⚠ Report this listing</Text>
        </Pressable>

        {reporting && (
          <ReportModal targetId={listing.id} onClose={() => setReporting(false)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
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
  photos: {
    flexGrow: 0,
    marginBottom: 14,
  },
  photo: {
    width: 220,
    height: 150,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeAvailable: {
    backgroundColor: '#e6f6ec',
  },
  badgeTextAvailable: {
    color: '#0b7a3e',
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  facts: {
    marginTop: 18,
    gap: 10,
  },
  fact: {},
  factLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
  },
  factValue: {
    fontSize: 15,
    color: '#1a1a1a',
    marginTop: 2,
  },
  donorCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 16,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b7a3e',
  },
  donorMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  claimButton: {
    backgroundColor: '#0b7a3e',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  unavailableNote: {
    textAlign: 'center',
    color: '#c0392b',
    fontSize: 14,
    marginTop: 24,
    fontWeight: '600',
  },
  reportLink: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  reportLinkText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginTop: 40,
  },
});
