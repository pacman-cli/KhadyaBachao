import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker} from 'react-native-maps';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {
  nearbyListings,
  type FoodType,
  type Listing,
} from '../../api/listings';
import {
  DHAKA_CENTER,
  getCurrentCoords,
  type Coords,
} from '../../utils/location';
import {
  useListingEvents,
} from '../../hooks/useListingEvents';
import type {ListingEvent} from '../../api/wsClient';

const TYPE_COLORS: Record<FoodType, string> = {
  COOKED: '#e67e22',
  PACKAGED: '#2980b9',
  RAW: '#27ae60',
};

const RADII_KM = [2, 5, 10, 25];
const TYPES: {value: FoodType | 'ALL'; label: string}[] = [
  {value: 'ALL', label: 'All'},
  {value: 'COOKED', label: 'Cooked'},
  {value: 'PACKAGED', label: 'Packaged'},
  {value: 'RAW', label: 'Raw'},
];

type Props = NativeStackScreenProps<RootStackParamList, 'Discover'>;

export function DiscoverScreen({navigation}: Props) {
  const [coords, setCoords] = useState<Coords>(DHAKA_CENTER);
  const [radiusKm, setRadiusKm] = useState(5);
  const [foodType, setFoodType] = useState<FoodType | 'ALL'>('ALL');
  const [listings, setListings] = useState<Listing[]>([]);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);

  const load = useCallback(
    async (at?: Coords) => {
      try {
        const results = await nearbyListings({
          lat: at?.lat ?? coords.lat,
          lng: at?.lng ?? coords.lng,
          radiusKm,
          foodType: foodType === 'ALL' ? undefined : foodType,
        });
        setListings(results);
      } catch {
        setListings([]);
      }
    },
    [coords.lat, coords.lng, radiusKm, foodType],
  );

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await getCurrentCoords();
      if (c) {
        setCoords(c);
      }
      await load(c ?? undefined);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!loading) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm, foodType]);

  // live feed: new/claimed/expired listings refresh the map & list instantly
  useListingEvents(
    useCallback(
      (_event: ListingEvent) => {
        load();
      },
      [load],
    ),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openDetail(listing: Listing) {
    navigation.navigate('ListingDetail', {listingId: listing.id});
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Discover food</Text>
        <Pressable
          style={styles.modeToggle}
          onPress={() => setMode(m => (m === 'map' ? 'list' : 'map'))}>
          <Text style={styles.modeToggleText}>
            {mode === 'map' ? 'List view' : 'Map view'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}>
        {TYPES.map(t => (
          <Pressable
            key={t.value}
            style={[styles.chip, foodType === t.value && styles.chipActive]}
            onPress={() => setFoodType(t.value)}>
            <Text
              style={[styles.chipText, foodType === t.value && styles.chipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
        {RADII_KM.map(km => (
          <Pressable
            key={km}
            style={[styles.chip, radiusKm === km && styles.chipActive]}
            onPress={() => setRadiusKm(km)}>
            <Text
              style={[styles.chipText, radiusKm === km && styles.chipTextActive]}>
              {km} km
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={styles.spinner} size="large" color="#0b7a3e" />
      ) : mode === 'map' ? (
        <View style={styles.flex}>
          <MapView
            style={styles.flex}
            initialRegion={{
              latitude: coords.lat,
              longitude: coords.lng,
              latitudeDelta: Math.max(0.02, radiusKm / 25),
              longitudeDelta: Math.max(0.02, radiusKm / 20),
            }}>
            {listings.map(l => (
              <Marker
                key={l.id}
                coordinate={{latitude: l.pickupLat, longitude: l.pickupLng}}
                pinColor={TYPE_COLORS[l.foodType]}
                onPress={() => setSelected(l)}
                title={l.title}
                description={`${Number(l.quantityValue)} ${l.quantityUnit}`}
              />
            ))}
          </MapView>

          {selected && (
            <Pressable style={styles.preview} onPress={() => openDetail(selected)}>
              <Text style={styles.previewTitle}>{selected.title}</Text>
              <Text style={styles.previewMeta}>
                {Number(selected.quantityValue)} {selected.quantityUnit} ·{' '}
                {selected.foodType.toLowerCase()} · until{' '}
                {new Date(selected.pickupDeadline).toLocaleTimeString()}
              </Text>
              <Text style={styles.previewCta}>Tap to view details</Text>
            </Pressable>
          )}

          {!selected && listings.length === 0 && (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyText}>
                No available listings within {radiusKm} km.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No available listings within {radiusKm} km.
            </Text>
          }
          renderItem={({item}) => (
            <Pressable style={styles.card} onPress={() => openDetail(item)}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View
                  style={[
                    styles.typeDot,
                    {backgroundColor: TYPE_COLORS[item.foodType]},
                  ]}
                />
              </View>
              <Text style={styles.cardMeta}>
                {Number(item.quantityValue)} {item.quantityUnit} ·{' '}
                {item.foodType.toLowerCase()}
                {item.donorName ? ` · by ${item.donorName}` : ''}
                {item.donorVerified ? ' ✓' : ''}
              </Text>
              <Text style={styles.cardMeta}>
                Until {new Date(item.pickupDeadline).toLocaleString()}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  modeToggle: {
    borderWidth: 1,
    borderColor: '#0b7a3e',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeToggleText: {
    color: '#0b7a3e',
    fontSize: 13,
    fontWeight: '700',
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexGrow: 0,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  chipActive: {
    backgroundColor: '#0b7a3e',
    borderColor: '#0b7a3e',
  },
  chipText: {
    fontSize: 13,
    color: '#444',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  spinner: {
    marginTop: 40,
  },
  preview: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  previewMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  previewCta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0b7a3e',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: '#ffffffee',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 30,
    fontSize: 14,
  },
});
