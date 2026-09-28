import React from 'react';
import {Text as RNText, TextProps as RNTextProps, TextStyle} from 'react-native';
import {typography} from '../theme/typography';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'button';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export function AppText({
  children,
  variant = 'body',
  color,
  weight,
  align,
  style,
  ...props
}: AppTextProps) {
  const baseStyle = typography[variant] || typography.body;

  return (
    <RNText
      style={[
        baseStyle,
        color ? {color} : null,
        weight ? {fontWeight: weight} : null,
        align ? {textAlign: align} : null,
        style,
      ]}
      {...props}>
      {children}
    </RNText>
  );
}
