import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker} from 'react-native-maps';
import type {Region} from 'react-native-maps';
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
import {useFilterStore} from '../../store/filterStore';
import {canNavigate} from '../../utils/navThrottle';
import {formatDateTime, formatTime} from '../../utils/datetime';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {Badge} from '../../components/Badge';
import {EmptyState} from '../../components/EmptyState';
import {LoadingState} from '../../components/LoadingState';

const TYPE_COLORS: Record<FoodType, string> = {
  COOKED: '#C2410C',
  PACKAGED: '#1D4ED8',
  RAW: '#15803D',
};

const RADII_KM = [2, 5, 10, 25];

/** Deltas that make the given radius (km) comfortably visible on the map. */
function regionForRadius(center: Coords, radiusKm: number): Region {
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: Math.max(0.02, (radiusKm * 2.4) / 111),
    longitudeDelta: Math.max(0.02, (radiusKm * 2.4) / 95),
  };
}
const TYPES: {value: FoodType | 'ALL'; label: string; emoji: string}[] = [
  {value: 'ALL', label: 'All Types', emoji: '🍱'},
  {value: 'COOKED', label: 'Cooked', emoji: '🍲'},
  {value: 'PACKAGED', label: 'Packaged', emoji: '📦'},
  {value: 'RAW', label: 'Raw', emoji: '🥦'},
];

const ListingCard = React.memo(function ListingCard({
  item,
  onPress,
}: {
  item: Listing;
  onPress: (item: Listing) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      style={({pressed}) => [styles.card, pressed && styles.pressed]}
      onPress={handlePress}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Badge label={item.foodType} variant={item.foodType} />
      </View>

      <Text style={styles.cardMeta}>
        📦 {Number(item.quantityValue)} {item.quantityUnit}
        {item.donorName ? ` · by ${item.donorName}` : ''}
        {item.donorVerified ? ' ✓' : ''}
      </Text>

      {item.pickupAddress ? (
        <Text style={styles.locationText} numberOfLines={1}>
          📍 {item.pickupAddress}
        </Text>
      ) : null}

      <Text style={styles.deadlineText}>
        ⏰ Deadline: {formatDateTime(item.pickupDeadline)}
      </Text>
    </Pressable>
  );
});

type Props = NativeStackScreenProps<RootStackParamList, 'Discover'>;

export function DiscoverScreen({navigation}: Props) {
  const [coords, setCoords] = useState<Coords>(DHAKA_CENTER);
  // Filters live in the shared filterStore so they survive Discover unmounts
  // (app restart, MyClaims → Find Food replace) instead of silently resetting.
  const radiusKm = useFilterStore(state => state.radiusKm);
  const setRadiusKm = useFilterStore(state => state.setRadiusKm);
  const foodType = useFilterStore(state => state.foodType);
  const setFoodType = useFilterStore(state => state.setFoodType);
  const [listings, setListings] = useState<Listing[]>([]);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);
  const mapRef = useRef<MapView>(null);
  const locatedRef = useRef(false);

  // Requests fire on every filter/radius/region change; responses can arrive
  // out of order (bigger radius = bigger payload = slower), so each load is
  // sequenced and stale responses are dropped instead of overwriting newer ones.
  const loadSeq = useRef(0);
  const load = useCallback(
    async (at?: Coords) => {
      const seq = ++loadSeq.current;
      try {
        const results = await nearbyListings({
          lat: at?.lat ?? coords.lat,
          lng: at?.lng ?? coords.lng,
          radiusKm,
          foodType: foodType === 'ALL' ? undefined : foodType,
        });
        if (seq !== loadSeq.current) {
          return; // a newer request already answered
        }
        setLoadFailed(false);
        setListings(results);
        // Drop a selection that no longer exists in the refreshed feed.
        setSelected(prev =>
          prev && results.some(r => r.id === prev.id) ? prev : null,
        );
      } catch {
        if (seq !== loadSeq.current) {
          return;
        }
        // A failed load must not read as "no food nearby" — tell the user it
        // errored so they retry instead of going hungry.
        setLoadFailed(true);
        setListings([]);
        setSelected(null);
      }
    },
    [coords.lat, coords.lng, radiusKm, foodType],
  );

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const c = await getCurrentCoords();
      if (c) {
        locatedRef.current = true;
        setCoords(c);
      }
      await load(c ?? undefined);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the map centered on the effective search center: re-centers once when
  // the device location arrives, and whenever the radius filter changes.
  React.useEffect(() => {
    if (mode === 'map' && !loading) {
      mapRef.current?.animateToRegion(regionForRadius(coords, radiusKm), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng, radiusKm, mode, loading]);

  React.useEffect(() => {
    if (!loading) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm, foodType]);

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

  const openDetail = useCallback((listing: Listing) => {
    // The preview card AND its inner button both call this — a throttle stops
    // a double-tap from stacking two ListingDetail screens.
    if (!canNavigate()) {
      return;
    }
    navigation.navigate('ListingDetail', {listingId: listing.id});
  }, [navigation]);

  const validListings = useMemo(() => {
    return listings.filter(
      l =>
        typeof l.pickupLat === 'number' &&
        typeof l.pickupLng === 'number' &&
        !isNaN(l.pickupLat) &&
        !isNaN(l.pickupLng) &&
        l.pickupLat >= -90 &&
        l.pickupLat <= 90 &&
        l.pickupLng >= -180 &&
        l.pickupLng <= 180,
    );
  }, [listings]);

  const renderItem = useCallback(
    ({item}: {item: Listing}) => <ListingCard item={item} onPress={openDetail} />,
    [openDetail],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Discover Food"
        subtitle={`${listings.length} available near you`}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <AppButton
            title={mode === 'map' ? '📋 List' : '🗺️ Map'}
            variant="outline"
            size="sm"
            onPress={() => setMode(m => (m === 'map' ? 'list' : 'map'))}
          />
        }
      />

      {/* Filter Chips Bar */}
      <View style={styles.filtersBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}>
          {TYPES.map(t => (
            <Pressable
              key={t.value}
              style={[styles.chip, foodType === t.value && styles.chipActive]}
              onPress={() => setFoodType(t.value)}>
              <Text style={styles.chipEmoji}>{t.emoji}</Text>
              <Text
                style={[
                  styles.chipText,
                  foodType === t.value && styles.chipTextActive,
                ]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.filterDivider} />
          {RADII_KM.map(km => (
            <Pressable
              key={km}
              style={[styles.chip, radiusKm === km && styles.chipActive]}
              onPress={() => setRadiusKm(km)}>
              <Text
                style={[
                  styles.chipText,
                  radiusKm === km && styles.chipTextActive,
                ]}>
                {km} km
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingState message="Finding surplus food near you..." />
      ) : mode === 'map' ? (
        <View style={styles.flex}>
          <MapView
            ref={mapRef}
            style={styles.flex}
            // Native Google Maps tiles (free/unlimited for Android mobile).
            // The previous OSM UrlTile overlay is blocked by OpenStreetMap's
            // tile usage policy — react-native-maps sends no User-Agent and
            // tile.openstreetmap.org answers 403 "Access blocked" images.
            initialRegion={regionForRadius(coords, radiusKm)}
            showsUserLocation
            showsMyLocationButton={false}>
            {validListings.map(l => (
              <Marker
                key={l.id}
                tracksViewChanges={false}
                coordinate={{latitude: l.pickupLat, longitude: l.pickupLng}}
                pinColor={TYPE_COLORS[l.foodType]}
                identifier={l.id}
                onPress={() => setSelected(l)}
                title={l.title}
                description={`${Number(l.quantityValue)} ${l.quantityUnit}`}
              />
            ))}
          </MapView>

          {/* Selected Item Floating Card */}
          {selected ? (
            <Pressable style={styles.previewCard} onPress={() => openDetail(selected)}>
              <View style={styles.previewHeader}>
                <Badge label={selected.foodType} variant={selected.foodType} />
                <Text style={styles.previewQty}>
                  {Number(selected.quantityValue)} {selected.quantityUnit}
                </Text>
              </View>
              <Text style={styles.previewTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.previewMeta}>
                ⏰ Pickup until {formatTime(selected.pickupDeadline)}
              </Text>
              <AppButton
                title="View Listing Details →"
                variant="primary"
                size="sm"
                onPress={() => openDetail(selected)}
                style={styles.previewBtn}
              />
            </Pressable>
          ) : null}

          {!selected && listings.length === 0 ? (
            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyOverlayText}>
                {loadFailed
                  ? 'Could not load listings — pull to retry.'
                  : `No listings found within ${radiusKm} km radius.`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            loadFailed ? (
              <EmptyState
                title="Couldn't Load Listings"
                message="Something went wrong while searching. Check your connection and try again."
                actionLabel="Retry"
                onAction={() => load()}
              />
            ) : (
              <EmptyState
                title="No Food Nearby"
                message={`We couldn't find any surplus food within ${radiusKm} km. Try increasing the search radius.`}
                actionLabel="Expand Radius to 25 km"
                // Reload explicitly: if the radius is already 25 the store
                // update is a no-op and the button would do nothing.
                onAction={() => {
                  setRadiusKm(25);
                  load();
                }}
              />
            )
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    // 44dp-equivalent tap target: these chips are the primary radius/type
    // selectors and were ~30dp tall, easy to mistap.
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  previewCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    gap: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  previewMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  previewBtn: {
    marginTop: spacing.xs,
  },
  emptyOverlay: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
  },
  emptyOverlayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 4,
  },
  pressed: {
    borderColor: colors.primary,
    transform: [{scale: 0.99}],
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deadlineText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
