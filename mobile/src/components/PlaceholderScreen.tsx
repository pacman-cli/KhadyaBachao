import React from 'react';
import {Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

type Props = {
  title: string;
  subtitle?: string;
};

export function PlaceholderScreen({title, subtitle}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
