import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftRow}>
        {showBack ? (
          <Pressable
            style={({pressed}) => [styles.backButton, pressed && styles.pressed]}
            onPress={onBack}
            hitSlop={8}
            accessibilityLabel="Go back"
            accessibilityRole="button">
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        ) : null}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});
