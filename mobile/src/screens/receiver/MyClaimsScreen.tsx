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
import {cancelClaim, myClaims, openReceiptPdf, type FoodRequest} from '../../api/requests';
import {RatingModal} from '../../components/RatingModal';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {Badge} from '../../components/Badge';
import {EmptyState} from '../../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'MyClaims'>;

export function MyClaimsScreen({navigation}: Props) {
  const [claims, setClaims] = useState<FoodRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingClaim, setRatingClaim] = useState<FoodRequest | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setClaims(await myClaims());
      setLoaded(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not load your claims');
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
    Alert.alert('Release claim', `Release "${claim.listingTitle}"?`, [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, release it',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelClaim(claim.id);
          } catch (e: any) {
            Alert.alert(
              'Error',
              e?.response?.data?.detail ?? 'Could not release the claim',
            );
            return;
          }
          load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="My Claimed Food"
        subtitle="Track pickup status, chat with donors & rate completed rescues"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <AppButton
            title="Find Food"
            size="sm"
            onPress={() => navigation.replace('Discover')}
          />
        }
      />

      <FlatList
        data={claims}
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
        ListEmptyComponent={loaded ? (
          <EmptyState
            title="No Claims Yet"
            message="You haven't claimed any surplus food items. Discover available food near you on the map!"
            actionLabel="Discover Nearby Food"
            onAction={() => navigation.replace('Discover')}
          />
        ) : undefined}
        renderItem={({item}) => (
          <Pressable
            style={({pressed}) => [styles.card, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate('ListingDetail', {listingId: item.listingId})
            }>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={2}>{item.listingTitle}</Text>
              <Badge label={item.status} variant={item.status as any} />
            </View>

            <View style={styles.metaRow}>
              <Badge label={item.foodType} variant={item.foodType as any} size="sm" />
              <Text style={styles.metaText}>
                {Number(item.quantityValue)} {item.quantityUnit}
              </Text>
              <Text style={styles.statusSubtext}>
                · Status: {item.listingStatus.toLowerCase()}
              </Text>
            </View>

            {item.listingStatus === 'COMPLETED' && (
              <View style={styles.completedActionsRow}>
                {!item.rated && (
                  <AppButton
                    title="★ Rate Food & Donor"
                    variant="secondary"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => setRatingClaim(item)}
                  />
                )}
                <AppButton
                  title="📄 PDF Receipt"
                  variant="outline"
                  size="sm"
                  style={{flex: 1}}
                  onPress={async () => {
                    try {
                      await openReceiptPdf(item.id);
                    } catch (e: any) {
                      Alert.alert(
                        'Error',
                        e?.message ?? 'Could not open the receipt',
                      );
                    }
                  }}
                />
              </View>
            )}

            {(item.status === 'ACCEPTED' || item.status === 'PENDING') &&
              item.listingStatus !== 'COMPLETED' &&
              // Dead actions: if the donor cancelled/expired the listing, chat
              // and release target food that no longer exists.
              item.listingStatus !== 'CANCELLED' &&
              item.listingStatus !== 'EXPIRED' && (
                <View style={styles.actionsRow}>
                  <AppButton
                    title="💬 Chat & Pickup Schedule"
                    variant="primary"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        requestId: item.id,
                        title: item.listingTitle,
                      })
                    }
                  />
                  <Pressable
                    style={styles.cancelLink}
                    onPress={() => confirmCancel(item)}>
                    <Text style={styles.cancelLinkText}>Release</Text>
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
  pressed: {
    borderColor: colors.primary,
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
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusSubtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  completedActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelLink: {
    paddingHorizontal: spacing.sm,
    // Destructive action — generous tap target.
    paddingVertical: 12,
  },
  cancelLinkText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
