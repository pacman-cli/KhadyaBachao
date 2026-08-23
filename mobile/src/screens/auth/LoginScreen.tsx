import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const {devLogin, loading, error} = useAuthStore();

  const canSubmit = email.includes('@') && name.trim().length > 1;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}>
        <Text style={styles.logo}>Khadya Bachao</Text>
        <Text style={styles.tagline}>Rescue surplus food, feed people.</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit || loading}
          onPress={() => devLogin(email.trim(), name.trim())}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>

        <Text style={styles.note}>
          Dev mode: creates or resumes your account against the local backend.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0b7a3e',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 6,
    marginBottom: 40,
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#0b7a3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
