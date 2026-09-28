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
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {EmptyState} from '../../components/EmptyState';
import {formatTime} from '../../utils/datetime';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationsScreen({navigation}: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchNotifications(0, 50);
      setItems(data);
      setLoaded(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not load notifications');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
    } catch {
      Alert.alert('Error', 'Could not mark notifications as read');
      return;
    }
    load();
  }

  async function handleItemPress(item: NotificationItem) {
    if (!item.read) {
      markNotificationRead(item.id).catch(() => {});
      setItems(prev =>
        prev.map(i => (i.id === item.id ? {...i, read: true} : i)),
      );
    }

    // Parse deep-link parameters if available.
    // New backend writes real JSON; also tolerate legacy `{k=v, ...}` rows.
    let data: Record<string, string> = {};
    if (item.dataJson) {
      try {
        data = JSON.parse(item.dataJson);
      } catch {
        try {
          data = JSON.parse(
            item.dataJson
              .replace(/^\{/, '{')
              .replace(/\}$/,'}')
              .replace(/([{,]\s*)([A-Za-z0-9_.-]+)=/g, '$1"$2":')
              .replace(/'/g, '"'),
          );
        } catch {
          data = {};
        }
      }
    }

    if (item.type === 'CLAIM' || item.type === 'CLAIM_APPROVED' || item.type === 'COMPLETED') {
      if (data.listingId) {
        navigation.navigate('ListingDetail', {listingId: data.listingId});
      } else {
        navigation.navigate('MyClaims');
      }
    } else if (item.type === 'CHAT' && data.requestId) {
      // Chat push bodies are formatted "ListingTitle: message" — show the
      // listing title in the chat header instead of a generic "Chat".
      const listingTitle = item.body.split(':')[0]?.trim() || 'Chat';
      navigation.navigate('Chat', {
        requestId: data.requestId,
        title: listingTitle,
      });
    } else if (item.type === 'VERIFICATION' || item.type === 'RATING') {
      navigation.navigate('Profile');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Notifications"
        subtitle="Stay updated on food claims, pickups, and alerts"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <AppButton
            title="Mark All Read"
            variant="ghost"
            size="sm"
            onPress={handleMarkAllRead}
          />
        }
      />

      <FlatList
        data={items}
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
            title="No Notifications"
            message="You're all caught up! Updates about your claims, pickups, and messages will appear here."
          />
        ) : undefined}
        renderItem={({item}) => (
          <Pressable
            style={({pressed}) => [
              styles.card,
              !item.read && styles.unreadCard,
              pressed && styles.pressed,
            ]}
            onPress={() => handleItemPress(item)}>
            <View style={styles.rowBetween}>
              <Text style={[styles.title, !item.read && styles.unreadText]}>
                {!item.read ? '🔵 ' : ''}
                {item.title}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
            <Text style={styles.bodyText}>{item.body}</Text>
          </Pressable>
        )}
      />
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
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  unreadCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  unreadText: {
    color: colors.primaryDark,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
