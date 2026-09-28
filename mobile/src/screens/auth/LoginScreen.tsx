import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {ConfirmationResult} from '@react-native-firebase/auth';
import {useAuthStore} from '../../store/authStore';
import {
  signUpWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithPhoneNumber,
  confirmPhoneCode,
  getCurrentFirebaseIdToken,
} from '../../services/firebaseAuthService';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppButton} from '../../components/AppButton';
import {AppTextInput} from '../../components/AppTextInput';

type AuthMode = 'email' | 'phone';

export function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmResult, setConfirmResult] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {devLogin, firebaseLogin, error: storeError} = useAuthStore();

  async function handleBackendExchange() {
    const idToken = await getCurrentFirebaseIdToken();
    if (idToken) {
      const ok = await firebaseLogin(idToken);
      if (!ok) {
        throw new Error('Backend token exchange failed');
      }
    } else {
      const devEmail = email.trim() || phone.trim() || 'user@khadyabachao.org';
      const devName = name.trim() || 'App User';
      const ok = await devLogin(devEmail, devName);
      if (!ok) {
        throw new Error('Dev authentication failed');
      }
    }
  }

  async function handleEmailAuth() {
    setLoading(true);
    setErrorMsg('');
    try {
      if (isSignUp) {
        await signUpWithEmailPassword(email.trim(), password);
      } else {
        await signInWithEmailPassword(email.trim(), password);
      }
      await handleBackendExchange();
    } catch (e: any) {
      // Audit M14: the silent dev-login fallback previously fired in release
      // builds too, logging users into a dev-identity without their knowledge.
      if (__DEV__) {
        try {
          await devLogin(email.trim() || 'user@khadyabachao.org', name.trim() || 'User');
        } catch {
          setErrorMsg(e?.message || 'Authentication failed');
        }
      } else {
        setErrorMsg(e?.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      await handleBackendExchange();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneOtp() {
    const rawPhone = phone.trim();
    if (!rawPhone) {
      Alert.alert('Phone required', 'Enter phone number with country code (e.g. +8801700000000)');
      return;
    }
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+880${rawPhone.replace(/^0+/, '')}`;
    setLoading(true);
    setErrorMsg('');
    try {
      const confirmation = await signInWithPhoneNumber(formattedPhone);
      setConfirmResult(confirmation);
      Alert.alert('OTP Sent', `Check SMS sent to ${formattedPhone}`);
    } catch {
      // Audit M15: dev-login fallback only in development builds; release
      // builds surface the real Firebase error instead of silently dev-logging-in.
      if (__DEV__) {
        Alert.alert(
          'Firebase Phone Auth Notice',
          'SMS verification requires Firebase billing/test numbers. Falling back to Dev Login.',
          [
            {
              text: 'OK',
              onPress: () => {
                devLogin(formattedPhone, name.trim() || 'Phone User');
              },
            },
          ],
        );
      } else {
        Alert.alert(
          'Verification Failed',
          'Could not send the SMS code. Please check your phone number and try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmOtp() {
    if (!confirmResult || !otpCode.trim()) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await confirmPhoneCode(confirmResult, otpCode.trim());
      await handleBackendExchange();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLoginClick() {
    setLoading(true);
    setErrorMsg('');
    try {
      await devLogin(email.trim() || 'dev@test.com', name.trim() || 'Dev User');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Dev login failed');
    } finally {
      setLoading(false);
    }
  }

  const activeError = errorMsg || storeError;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoIconBg}>
              <Text style={styles.logoEmoji}>🌾</Text>
            </View>
            <Text style={styles.logoText}>Khadya Bachao</Text>
            <Text style={styles.tagline}>
              Rescue surplus food. Feed people. Reduce waste.
            </Text>
          </View>

          {/* Auth Method Switcher */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => setMode('email')}>
              <Text
                style={[
                  styles.tabText,
                  mode === 'email' && styles.tabTextActive,
                ]}>
                Email Auth
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'phone' && styles.tabActive]}
              onPress={() => setMode('phone')}>
              <Text
                style={[
                  styles.tabText,
                  mode === 'phone' && styles.tabTextActive,
                ]}>
                Phone OTP
              </Text>
            </Pressable>
          </View>

          {activeError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {activeError}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          {mode === 'email' ? (
            <View style={styles.formSection}>
              {isSignUp ? (
                <AppTextInput
                  label="Full Name"
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                />
              ) : null}

              <AppTextInput
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AppTextInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <AppButton
                title={isSignUp ? 'Create Account' : 'Sign In'}
                variant="primary"
                size="lg"
                loading={loading}
                onPress={handleEmailAuth}
                style={styles.actionBtn}
              />

              <Pressable
                style={styles.toggleRow}
                onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleText}>
                  {isSignUp
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                  <Text style={styles.toggleHighlight}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formSection}>
              {!confirmResult ? (
                <>
                  <AppTextInput
                    label="Phone Number"
                    placeholder="+8801700000000"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    helperText="Include country code (+880)"
                  />
                  <AppButton
                    title="Send OTP Code"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    onPress={handleSendPhoneOtp}
                    style={styles.actionBtn}
                  />
                </>
              ) : (
                <>
                  <AppTextInput
                    label="Verification Code"
                    placeholder="Enter 6-digit OTP code"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                  />
                  <AppButton
                    title="Verify & Continue"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    onPress={handleConfirmOtp}
                    style={styles.actionBtn}
                  />
                </>
              )}
            </View>
          )}

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.line} />
          </View>

          {/* Third Party & Dev Auth */}
          <View style={styles.secondaryAuthSection}>
            <AppButton
              title="Sign in with Google"
              variant="outline"
              size="md"
              loading={loading}
              onPress={handleGoogleAuth}
            />

            {__DEV__ ? (
              <AppButton
                title="Bypass with Dev Login (Dev Only)"
                variant="ghost"
                size="sm"
                onPress={handleDevLoginClick}
                style={styles.devBtn}
              />
            ) : null}
          </View>

          <Text style={styles.footerNote}>
            🔒 Secured by Firebase Auth & KhadyaBachao Backend API
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xxl,
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoEmoji: {
    fontSize: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  toggleRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    marginHorizontal: spacing.md,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryAuthSection: {
    gap: spacing.sm,
  },
  devBtn: {
    marginTop: spacing.xs,
  },
  footerNote: {
    marginTop: spacing.xxl,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
