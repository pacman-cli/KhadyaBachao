import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {
  confirmSchedule,
  fetchHistory,
  getSchedule,
  proposeSchedule,
  sendMessageRest,
  type ChatMessage,
  type Schedule,
} from '../../api/chat';
import {publishChatMessage} from '../../api/wsClient';
import {subscribeWhenConnected} from '../../api/wsClient';
import {useAuthStore} from '../../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({route}: Props) {
  const requestId = route.params.requestId;
  const userId = useAuthStore(state => state.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // schedule proposal form
  const [showProposal, setShowProposal] = useState(false);
  const [proposedAt, setProposedAt] = useState(() => new Date(Date.now() + 3600e3));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchHistory(requestId)
      .then(setMessages)
      .catch(() => {});
    getSchedule(requestId).then(setSchedule).catch(() => {});
  }, [requestId]);

  useEffect(() => {
    return subscribeWhenConnected(`/topic/chat/${requestId}`, body => {
      try {
        const msg = JSON.parse(body) as ChatMessage;
        setMessages(prev =>
          prev.some(m => m.id === msg.id) ? prev : [...prev, msg],
        );
      } catch {
        // ignore malformed frames
      }
    });
  }, [requestId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    setInput('');
    try {
      const viaWs = publishChatMessage(requestId, text);
      if (!viaWs) {
        await sendMessageRest(requestId, text);
      }
    } catch {
      Alert.alert('Error', 'Could not send the message');
      setInput(text); // restore draft
    } finally {
      setSending(false);
    }
  }, [input, requestId, sending]);

  async function propose() {
    try {
      const s = await proposeSchedule(
        requestId,
        proposedAt.toISOString(),
        location.trim(),
      );
      setSchedule(s);
      setShowProposal(false);
    } catch (e) {
      Alert.alert(
        'Error',
        (e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ??
          'Could not propose a time',
      );
    }
  }

  async function confirm() {
    try {
      const s = await confirmSchedule(requestId);
      setSchedule(s);
    } catch (e) {
      Alert.alert(
        'Error',
        (e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ??
          'Could not confirm',
      );
    }
  }

  function myConfirmState(s: Schedule | null): boolean {
    if (!s || !userId) return false;
    // donor confirmation state unknown client-side per role; show both flags
    return s.confirmedByDonor && s.confirmedByRecipient;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <SchedulePanel
          schedule={schedule}
          bothConfirmed={myConfirmState(schedule)}
          showProposal={showProposal}
          onToggleProposal={() => setShowProposal(v => !v)}
          proposedAt={proposedAt}
          showDatePicker={showDatePicker}
          onShowDatePicker={() => setShowDatePicker(true)}
          onDateChange={(_e, d) => {
            setShowDatePicker(Platform.OS !== 'ios');
            if (d) setProposedAt(d);
          }}
          location={location}
          onChangeLocation={setLocation}
          onPropose={propose}
          onConfirm={confirm}
        />

        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({item}) => (
            <View
              style={[
                styles.bubble,
                item.senderId === userId ? styles.mine : styles.theirs,
              ]}>
              {item.senderId !== userId && (
                <Text style={styles.senderName}>{item.senderName}</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  item.senderId === userId && styles.myMessageText,
                ]}>
                {item.message}
              </Text>
              <Text
                style={[
                  styles.time,
                  item.senderId === userId && styles.myTime,
                ]}>
                {new Date(item.sentAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No messages yet — say hello and arrange the pickup!
            </Text>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#999"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
            disabled={!input.trim() || sending}
            onPress={send}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PanelProps = {
  schedule: Schedule | null;
  bothConfirmed: boolean;
  showProposal: boolean;
  onToggleProposal: () => void;
  proposedAt: Date;
  showDatePicker: boolean;
  onShowDatePicker: () => void;
  onDateChange: (_e: unknown, d?: Date) => void;
  location: string;
  onChangeLocation: (v: string) => void;
  onPropose: () => void;
  onConfirm: () => void;
};

function SchedulePanel(p: PanelProps) {
  const s = p.schedule;
  return (
    <View style={styles.panel}>
      {!s ? (
        <>
          <Pressable style={styles.panelButton} onPress={p.onToggleProposal}>
            <Text style={styles.panelButtonText}>
              {p.showProposal ? 'Hide pickup form' : 'Propose pickup time & place'}
            </Text>
          </Pressable>
          {p.showProposal && (
            <View style={styles.proposalForm}>
              <Pressable style={styles.dateField} onPress={p.onShowDatePicker}>
                <Text style={styles.dateValue}>
                  {p.proposedAt.toLocaleString()}
                </Text>
              </Pressable>
              {p.showDatePicker && (
                <DateTimePicker
                  value={p.proposedAt}
                  mode="datetime"
                  minimumDate={new Date()}
                  onChange={p.onDateChange}
                />
              )}
              <TextInput
                style={styles.locationInput}
                placeholder="Pickup location (e.g. Gate 2, Gulshan 1)"
                placeholderTextColor="#999"
                value={p.location}
                onChangeText={p.onChangeLocation}
              />
              <Pressable
                style={[
                  styles.confirmButton,
                  !p.location.trim() && styles.sendDisabled,
                ]}
                disabled={!p.location.trim()}
                onPress={p.onPropose}>
                <Text style={styles.confirmText}>Send proposal</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : p.bothConfirmed || s.status === 'CONFIRMED' ? (
        <View style={styles.confirmedBox}>
          <Text style={styles.confirmedTitle}>
            Pickup confirmed — {s.agreedLocation}
          </Text>
          <Text style={styles.confirmedMeta}>
            {new Date(s.agreedTime).toLocaleString()}
          </Text>
        </View>
      ) : (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingTitle}>Pickup proposed</Text>
          <Text style={styles.pendingMeta}>
            {new Date(s.agreedTime).toLocaleString()} · {s.agreedLocation}
          </Text>
          <Text style={styles.pendingMeta}>
            Donor {s.confirmedByDonor ? '✓' : '…'} · Recipient{' '}
            {s.confirmedByRecipient ? '✓' : '…'}
          </Text>
          <Pressable style={styles.confirmButton} onPress={p.onConfirm}>
            <Text style={styles.confirmText}>I confirm this plan</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  panel: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  panelButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0b7a3e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  panelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  proposalForm: {
    marginTop: 10,
    gap: 8,
  },
  dateField: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
  },
  dateValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#0b7a3e',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmedBox: {
    backgroundColor: '#e6f6ec',
    borderRadius: 10,
    padding: 12,
  },
  confirmedTitle: {
    fontWeight: '800',
    color: '#0b7a3e',
    fontSize: 14,
  },
  confirmedMeta: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  pendingBox: {
    backgroundColor: '#fdf1d6',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  pendingTitle: {
    fontWeight: '800',
    color: '#9a6b00',
    fontSize: 14,
  },
  pendingMeta: {
    fontSize: 13,
    color: '#555',
  },
  messages: {
    padding: 12,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  mine: {
    backgroundColor: '#0b7a3e',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  theirs: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e2e2',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0b7a3e',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  myMessageText: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: '#888',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: '#cfe8d8',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
    transform: [{rotate: '180deg'}],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
    paddingBottom: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  sendButton: {
    backgroundColor: '#0b7a3e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
