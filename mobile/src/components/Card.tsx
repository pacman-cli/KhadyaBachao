import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';
import {shadows} from '../theme/shadows';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevation?: 'sm' | 'md' | 'lg';
};

export function Card({
  children,
  onPress,
  style,
  elevation = 'sm',
}: CardProps) {
  if (onPress) {
    return (
      <Pressable
        style={({pressed}) => [
          styles.card,
          shadows[elevation],
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, shadows[elevation], style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  pressed: {
    opacity: 0.92,
    transform: [{scale: 0.99}],
  },
});
