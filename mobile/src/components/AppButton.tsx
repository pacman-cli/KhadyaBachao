import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {colors} from '../theme/colors';
import {radius} from '../theme/radius';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...props
}: AppButtonProps) {
  const isInteractive = !loading && !disabled;

  return (
    <Pressable
      disabled={!isInteractive}
      style={({pressed}) => [
        styles.button,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator
          size="small"
          // 'secondary' has a light background — a white spinner was invisible
          // (blank button during PostFood re-locate / document upload).
          color={
            variant === 'outline' || variant === 'ghost' || variant === 'secondary'
              ? colors.primary
              : '#FFFFFF'
          }
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              disabled && styles.disabledText,
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: 8,
  },
  pressed: {
    opacity: 0.88,
    transform: [{scale: 0.985}],
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.6,
  },
  disabledText: {
    color: colors.textLight,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
  },
  size_lg: {
    paddingHorizontal: 24,
    paddingVertical: 15,
    minHeight: 54,
  },

  // Text Styles
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: colors.primaryDark,
  },
  text_outline: {
    color: colors.primary,
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_ghost: {
    color: colors.primary,
  },

  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 17,
  },
});
