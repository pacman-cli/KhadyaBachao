import {TextStyle} from 'react-native';
import {colors} from './colors';

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    color: colors.text,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    color: colors.text,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    color: colors.text,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.text,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.text,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
};
