import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';
import {colors} from '../theme/colors';
import {radius} from '../theme/radius';

export interface AppTextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function AppTextInput({
  label,
  error,
  helperText,
  required = false,
  leftElement,
  rightElement,
  containerStyle,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...props
}: AppTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          !!error && styles.errorWrapper,
        ]}>
        {leftElement ? <View style={styles.leftContainer}>{leftElement}</View> : null}

        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textLight}
          secureTextEntry={isSecure}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {secureTextEntry ? (
          <Pressable
            style={styles.rightContainer}
            onPress={() => setIsSecure(!isSecure)}>
            <Text style={styles.toggleText}>{isSecure ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : rightElement ? (
          <View style={styles.rightContainer}>{rightElement}</View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  focusedWrapper: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  errorWrapper: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  leftContainer: {
    marginRight: 8,
  },
  rightContainer: {
    marginLeft: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
