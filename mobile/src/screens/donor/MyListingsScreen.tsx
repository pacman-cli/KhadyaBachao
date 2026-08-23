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
  requestsForListing,
  type FoodRequest,
} from '../../api/requests';

const STATUS_COLORS: Record<Listing['status'], string> = {
  AVAILABLE: '#0b7a3e',
  CLAIMED: '#1f6fb2',
  EXPIRED: '#999999',
  COMPLETED: '#6a4fb2',
  CANCELLED: '#c0392b',
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyListings'>;

export function MyListingsScreen({navigation}: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [claimsByListing, setClaimsByListing] = useState<Record<string, FoodRequest>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await myListings();
      setListings(data);
      // fetch claim details only for claimed listings
      const claimed = data.filter(l => l.status === 'CLAIMED');
      const entries = await Promise.all(
        claimed.map(async l => {
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
    } catch {
      // keep old data on failure
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
          await cancelListing(listing.id);
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
            await completePickup(claim.id);
            load();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>My listings</Text>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nothing posted yet. Tap “Post Food” to rescue your first meal.
          </Text>
        }
        renderItem={({item}) => {
          const claim = claimsByListing[item.id];
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{item.title}</Text>
                <View
                  style={[
                    styles.badge,
                    {backgroundColor: STATUS_COLORS[item.status] + '22'},
                  ]}>
                  <Text
                    style={[styles.badgeText, {color: STATUS_COLORS[item.status]}]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {Number(item.quantityValue)} {item.quantityUnit} ·{' '}
                {item.foodType.toLowerCase()}
                {item.pickupAddress ? ` · ${item.pickupAddress}` : ''}
              </Text>
              <Text style={styles.meta}>
                Deadline: {new Date(item.pickupDeadline).toLocaleString()}
              </Text>

              {item.status === 'CLAIMED' && (
                <View style={styles.claimBox}>
                  <Text style={styles.claimText}>
                    Claimed by {claim?.recipientName ?? '…'}
                    {claim?.recipientVerified ? ' ✓' : ''}
                  </Text>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, styles.chatBtn]}
                      onPress={() =>
                        claim &&
                        navigation.navigate('Chat', {
                          requestId: claim.id,
                          title: item.title,
                        })
                      }>
                      <Text style={styles.chatBtnText}>Chat</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.completeBtn]}
                      disabled={!claim}
                      onPress={() => confirmComplete(item, claim)}>
                      <Text style={styles.completeBtnText}>Mark picked up</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {(item.status === 'AVAILABLE' || item.status === 'CLAIMED') && (
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => confirmCancel(item)}>
                  <Text style={styles.cancelButtonText}>Cancel listing</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
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
    paddingBottom: 8,
  },
  list: {
    padding: 20,
    paddingTop: 4,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#fff',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  claimBox: {
    marginTop: 10,
    backgroundColor: '#eef6fb',
    borderRadius: 10,
    padding: 10,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f6fb2',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  chatBtn: {
    backgroundColor: '#1f6fb2',
  },
  chatBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  completeBtn: {
    backgroundColor: '#0b7a3e',
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
  },
});
