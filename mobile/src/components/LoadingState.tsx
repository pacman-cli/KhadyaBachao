import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';

export interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export function LoadingState({
  message = 'Loading...',
  style,
}: LoadingStateProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 200,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
