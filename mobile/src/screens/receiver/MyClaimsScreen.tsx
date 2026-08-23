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
import {cancelClaim, myClaims, type FoodRequest} from '../../api/requests';
import {RatingModal} from '../../components/RatingModal';

const STATUS_COLORS: Record<FoodRequest['status'], string> = {
  PENDING: '#e67e22',
  ACCEPTED: '#0b7a3e',
  REJECTED: '#c0392b',
  CANCELLED: '#999999',
};

type Props = NativeStackScreenProps<RootStackParamList, 'MyClaims'>;

export function MyClaimsScreen({navigation}: Props) {
  const [claims, setClaims] = useState<FoodRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingClaim, setRatingClaim] = useState<FoodRequest | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setClaims(await myClaims());
    } catch {
      // keep old data
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmCancel(claim: FoodRequest) {
    Alert.alert('Cancel claim', `Release "${claim.listingTitle}"?`, [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, release it',
        style: 'destructive',
        onPress: async () => {
          await cancelClaim(claim.id);
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>My claims</Text>
      <FlatList
        data={claims}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              No claims yet. Find food on the map!
            </Text>
            <Pressable
              style={styles.browseButton}
              onPress={() => navigation.replace('Discover')}>
              <Text style={styles.browseButtonText}>Browse map</Text>
            </Pressable>
          </View>
        }
        renderItem={({item}) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('ListingDetail', {listingId: item.listingId})
            }>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.listingTitle}</Text>
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
              {item.foodType.toLowerCase()} · pickup: {item.listingStatus.toLowerCase()}
            </Text>
            {item.listingStatus === 'COMPLETED' && !item.rated && (
              <Pressable
                style={[styles.actionButton, styles.chatButton]}
                onPress={() => setRatingClaim(item)}>
                <Text style={styles.chatButtonText}>★ Rate donor</Text>
              </Pressable>
            )}

            {(item.status === 'ACCEPTED' || item.status === 'PENDING') &&
              item.listingStatus !== 'COMPLETED' && (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionButton, styles.chatButton]}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        requestId: item.id,
                        title: item.listingTitle,
                      })
                    }>
                    <Text style={styles.chatButtonText}>Chat & schedule</Text>
                  </Pressable>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => confirmCancel(item)}>
                    <Text style={styles.cancelButtonText}>Release</Text>
                  </Pressable>
                </View>
              )}
          </Pressable>
        )}
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
  emptyWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  browseButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#0b7a3e',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  browseButtonText: {
    color: '#0b7a3e',
    fontWeight: '700',
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  chatButton: {
    backgroundColor: '#0b7a3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 0,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
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
