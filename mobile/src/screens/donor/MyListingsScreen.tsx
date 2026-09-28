import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {
  cancelListing,
  myListings,
  type Listing,
} from '../../api/listings';
import {
  completePickup,
  openReceiptPdf,
  requestsForListing,
  type FoodRequest,
} from '../../api/requests';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {Badge} from '../../components/Badge';
import {RatingModal} from '../../components/RatingModal';
import {EmptyState} from '../../components/EmptyState';
import {formatDateTime} from '../../utils/datetime';

type Props = NativeStackScreenProps<RootStackParamList, 'MyListings'>;

export function MyListingsScreen({navigation}: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [claimsByListing, setClaimsByListing] = useState<Record<string, FoodRequest>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [ratingClaim, setRatingClaim] = useState<FoodRequest | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await myListings();
      setListings(data);
      // Claims are needed for CLAIMED (approve/handover actions) *and*
      // COMPLETED (rate pickup / download receipt) — fetching only CLAIMED
      // made the rate + receipt buttons unreachable right after handover.
      const withClaims = data.filter(
        l => l.status === 'CLAIMED' || l.status === 'COMPLETED',
      );
      const entries = await Promise.all(
        withClaims.map(async l => {
          try {
            const reqs = await requestsForListing(l.id);
            const accepted = reqs.find(r => r.status === 'ACCEPTED') ?? reqs[0];
            return accepted ? [l.id, accepted] : null;
          } catch {
            return null;
          }
        }),
      );
      setClaimsByListing(Object.fromEntries(entries.filter(Boolean) as [string, FoodRequest][]));
      setLoaded(true);
    } catch (e: any) {
      // Keep old data on failure, but tell the user — silence read as success.
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not load your listings');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmCancel(listing: Listing) {
    Alert.alert('Cancel listing', `Cancel "${listing.title}"?`, [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, cancel it',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelListing(listing.id);
          } catch (e: any) {
            Alert.alert(
              'Error',
              e?.response?.data?.detail ?? 'Could not cancel the listing',
            );
            return;
          }
          load();
        },
      },
    ]);
  }

  function confirmComplete(listing: Listing, claim?: FoodRequest) {
    if (!claim) return;
    Alert.alert(
      'Confirm handover',
      `Mark "${listing.title}" as picked up by ${claim.recipientName ?? 'the claimer'}?`,
      [
        {text: 'Not yet', style: 'cancel'},
        {
          text: 'Picked up ✓',
          onPress: async () => {
            try {
              await completePickup(claim.id);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.detail ?? 'Could not complete the handover',
              );
              return;
            }
            load();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="My Food Listings"
        subtitle="Track and manage surplus food items you posted"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <AppButton
            title="+ Post Food"
            size="sm"
            onPress={() => navigation.navigate('PostFood')}
          />
        }
      />

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        // Only show the empty state once data actually loaded — during the
        // first fetch it flashed "No Listings Posted Yet" misleadingly.
        ListEmptyComponent={loaded ? (
          <EmptyState
            title="No Listings Posted Yet"
            message="Share extra food before it goes to waste. Tap below to create your first food listing."
            actionLabel="Post Surplus Food"
            onAction={() => navigation.navigate('PostFood')}
          />
        ) : undefined}
        renderItem={({item}) => {
          const claim = claimsByListing[item.id];
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Badge label={item.status} variant={item.status} />
              </View>

              <View style={styles.metaRow}>
                <Badge label={item.foodType} variant={item.foodType} size="sm" />
                <Text style={styles.metaText}>
                  {Number(item.quantityValue)} {item.quantityUnit}
                </Text>
              </View>

              {item.pickupAddress ? (
                <Text style={styles.locationText} numberOfLines={1}>
                  📍 {item.pickupAddress}
                </Text>
              ) : null}

              <Text style={styles.deadlineText}>
                ⏰ Pickup Deadline: {formatDateTime(item.pickupDeadline)}
              </Text>

              {item.status === 'COMPLETED' && claim && (
                <View style={styles.actionsRow}>
                  {!claim.rated && (
                    <AppButton
                      title="★ Rate Pickup"
                      variant="secondary"
                      size="sm"
                      style={{flex: 1}}
                      onPress={() => setRatingClaim(claim)}
                    />
                  )}
                  <AppButton
                    title="📄 PDF Receipt"
                    variant="outline"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => openReceiptPdf(claim.id)}
                  />
                </View>
              )}

              {item.status === 'CLAIMED' && (
                <View style={styles.claimBox}>
                  <Text style={styles.claimTitle}>
                    Claimed by: <Text style={styles.claimerName}>{claim?.recipientName ?? 'Recipient'}</Text>
                    {claim?.recipientVerified ? ' ✓' : ''}
                  </Text>
                  <View style={styles.actionsRow}>
                    <AppButton
                      title="Chat"
                      variant="primary"
                      size="sm"
                      style={{flex: 1}}
                      onPress={() =>
                        claim &&
                        navigation.navigate('Chat', {
                          requestId: claim.id,
                          title: item.title,
                        })
                      }
                    />
                    <AppButton
                      title="Mark Handed Over"
                      variant="secondary"
                      size="sm"
                      disabled={!claim}
                      style={{flex: 1.2}}
                      onPress={() => confirmComplete(item, claim)}
                    />
                  </View>
                </View>
              )}

              {(item.status === 'AVAILABLE' || item.status === 'CLAIMED') && (
                <Pressable
                  style={styles.cancelLink}
                  onPress={() => confirmCancel(item)}>
                  <Text style={styles.cancelLinkText}>Cancel Listing</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {ratingClaim && (
        <RatingModal
          claim={ratingClaim}
          onClose={() => setRatingClaim(null)}
          onRated={load}
        />
      )}
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
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deadlineText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  claimBox: {
    marginTop: spacing.md,
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  claimTitle: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  claimerName: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    // Destructive actions need a generous tap target (was 4dp vertical).
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cancelLinkText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
