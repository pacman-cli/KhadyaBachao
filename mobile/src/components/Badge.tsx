import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';

export type BadgeVariant =
  | 'COOKED'
  | 'PACKAGED'
  | 'RAW'
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

export function Badge({label, variant = 'AVAILABLE', size = 'sm', style}: BadgeProps) {
  let bg = colors.surfaceAlt;
  let textColor = colors.textSecondary;

  if (variant in colors.foodTypes) {
    const config = colors.foodTypes[variant as keyof typeof colors.foodTypes];
    bg = config.bg;
    textColor = config.text;
  } else if (variant in colors.status) {
    const config = colors.status[variant as keyof typeof colors.status];
    bg = config.bg;
    textColor = config.text;
  }

  return (
    <View
      style={[
        styles.badge,
        styles[`size_${size}`],
        {backgroundColor: bg},
        style,
      ]}>
      <Text style={[styles.text, styles[`text_${size}`], {color: textColor}]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 12,
  },
});
