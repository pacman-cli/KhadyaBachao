import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../theme/colors';
import {reportTarget} from '../api/reports';

type Props = {
  targetId: string;
  onClose: () => void;
};

export function ReportModal({targetId, onClose}: Props) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (reason.trim().length < 5) {
      return;
    }
    setSending(true);
    try {
      await reportTarget('LISTING', targetId, reason.trim());
      Alert.alert('Reported', 'Thanks — our moderators will take a look.');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not submit the report');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Report this listing</Text>
          <Text style={styles.subtitle}>
            Tell us what's wrong (spam, spoiled food, misleading info…)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Reason"
            placeholderTextColor={colors.textLight}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, (reason.trim().length < 5 || sending) && styles.disabled]}
              disabled={reason.trim().length < 5 || sending}
              onPress={submit}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Report</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#c0392b',
  },
  secondary: {
    backgroundColor: '#f0f0f0',
  },
  secondaryText: {
    color: '#444',
    fontWeight: '700',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
