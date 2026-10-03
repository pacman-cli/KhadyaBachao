import React, {useCallback, useEffect, useState} from 'react';
import {
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
import {subscribeWhenConnected} from '../../api/wsClient';
import {useAuthStore} from '../../store/authStore';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {formatDateTime, formatTime} from '../../utils/datetime';
import {useDateTimePicker} from '../../hooks/useDateTimePicker';
import {
  setActiveChatRequestId,
  setSchedulePushListener,
} from '../../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({route, navigation}: Props) {
  const {requestId, title: screenTitle} = route.params;
  const userId = useAuthStore(state => state.user?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // schedule proposal form
  const [showProposal, setShowProposal] = useState(false);
  const [proposedAt, setProposedAt] = useState(() => new Date(Date.now() + 3600e3));
  const [location, setLocation] = useState('');
  // Android needs a two-step date→time flow; mode="datetime" silently opens
  // a date-only picker there.
  const {open: openDatePicker, picker: datePicker} = useDateTimePicker(
    proposedAt,
    setProposedAt,
  );

  const loadHistory = useCallback(() => {
    // A failed history load must not read as "no messages" — the other party
    // may have written; surface it and let the user retry.
    setHistoryFailed(false);
    fetchHistory(requestId)
      .then(setMessages)
      .catch(() => setHistoryFailed(true));
  }, [requestId]);

  useEffect(() => {
    loadHistory();
    getSchedule(requestId).then(setSchedule).catch(() => {});
  }, [loadHistory, requestId]);

  // Suppress foreground push Alerts for the conversation the user is already
  // reading (the WS bubble renders it live). SCHEDULE pushes for this request
  // instead refresh the panel below — the backend pushes schedule changes via
  // FCM only, so without this the counterpart's confirmation stays invisible.
  useEffect(() => {
    setActiveChatRequestId(requestId);
    setSchedulePushListener(reqId => {
      if (reqId === requestId) {
        getSchedule(requestId).then(setSchedule).catch(() => undefined);
      }
    });
    return () => {
      setActiveChatRequestId(null);
      setSchedulePushListener(null);
    };
  }, [requestId]);

  // The backend publishes schedule changes via FCM (not a WS topic) — refresh
  // the panel when a chat message arrives, which typically accompanies a
  // The backend publishes schedule changes via FCM (not a WS topic) — refresh
  // the panel when a chat message arrives, which typically accompanies a
  // schedule proposal/confirmation.
  useEffect(() => {
    getSchedule(requestId).then(setSchedule).catch(() => undefined);
  }, [messages.length, requestId]);

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
      // Audit M20: REST is authoritative — it persists, broadcasts to the WS
      // topic and returns the saved message, so failures surface as an error
      // instead of vanishing after a fire-and-forget WS publish. Live delivery
      // to the other party still arrives via the /topic/chat subscription.
      const saved = await sendMessageRest(requestId, text);
      setMessages(prev =>
        prev.some(m => m.id === saved.id) ? prev : [...prev, saved],
      );
    } catch {
      Alert.alert('Error', 'Could not send the message');
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, requestId, sending]);

  async function propose() {
    // The default time is computed once at mount — a form left open past the
    // proposed slot would submit a time already in the past.
    if (proposedAt.getTime() <= Date.now()) {
      Alert.alert(
        'Pickup time passed',
        'The proposed time is already in the past — pick a new one.',
      );
      return;
    }
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

  // Audit M21: resolve confirmation per participant so the button reflects the
  // current user's own state instead of a single combined flag.
  function myConfirmFlags(s: Schedule | null): {me: boolean; other: boolean} {
    if (!s || !userId) {
      return {me: false, other: false};
    }
    const meIsDonor = s.donorId === userId;
    return {
      me: meIsDonor ? s.confirmedByDonor : s.confirmedByRecipient,
      other: meIsDonor ? s.confirmedByRecipient : s.confirmedByDonor,
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={screenTitle ?? 'Pickup Discussion'}
        subtitle="Live Chat & Schedule Agreement"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <SchedulePanel
          schedule={schedule}
          confirmFlags={myConfirmFlags(schedule)}
          showProposal={showProposal}
          onToggleProposal={() => setShowProposal(v => !v)}
          proposedAt={proposedAt}
          datePicker={datePicker}
          onShowDatePicker={openDatePicker}
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
                {formatTime(item.sentAt)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text
              style={styles.empty}
              onPress={historyFailed ? loadHistory : undefined}>
              {historyFailed
                ? 'Could not load messages — tap to retry.'
                : 'No messages yet — send a greeting to coordinate pickup!'}
            </Text>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textLight}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <AppButton
            title="Send"
            variant="primary"
            size="md"
            disabled={!input.trim() || sending}
            loading={sending}
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PanelProps = {
  schedule: Schedule | null;
  confirmFlags: {me: boolean; other: boolean};
  showProposal: boolean;
  onToggleProposal: () => void;
  proposedAt: Date;
  datePicker: React.ReactNode;
  onShowDatePicker: () => void;
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
          <AppButton
            title={p.showProposal ? 'Hide Schedule Proposal Form' : '📅 Propose Pickup Time & Location'}
            variant="secondary"
            size="sm"
            onPress={p.onToggleProposal}
          />
          {p.showProposal && (
            <View style={styles.proposalForm}>
              <Pressable style={styles.dateField} onPress={p.onShowDatePicker}>
                <Text style={styles.dateValue}>
                  ⏰ Time: {formatDateTime(p.proposedAt)}
                </Text>
              </Pressable>
              {p.datePicker}
              <TextInput
                style={styles.locationInput}
                placeholder="Pickup spot (e.g. Gate 2, Dhanmondi 32)"
                placeholderTextColor={colors.textLight}
                value={p.location}
                onChangeText={p.onChangeLocation}
              />
              <AppButton
                title="Send Schedule Proposal"
                variant="primary"
                size="sm"
                disabled={!p.location.trim()}
                onPress={p.onPropose}
              />
            </View>
          )}
        </>
      ) :
        (p.confirmFlags.me && p.confirmFlags.other) || s.status === 'CONFIRMED' ? (
        <View style={styles.confirmedBox}>
          <Text style={styles.confirmedTitle}>
            ✓ Pickup Confirmed — {s.agreedLocation}
          </Text>
          <Text style={styles.confirmedMeta}>
            ⏰ Agreed Time: {formatDateTime(s.agreedTime)}
          </Text>
        </View>
      ) : (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingTitle}>⏳ Pickup Proposal Awaiting Confirmation</Text>
          <Text style={styles.pendingMeta}>
            📍 Spot: {s.agreedLocation}
          </Text>
          <Text style={styles.pendingMeta}>
            ⏰ Time: {formatDateTime(s.agreedTime)}
          </Text>
          <Text style={styles.pendingSubmeta}>
            Donor: {s.confirmedByDonor ? '✓ Confirmed' : 'Pending'} · Recipient: {s.confirmedByRecipient ? '✓ Confirmed' : 'Pending'}
          </Text>
          <AppButton
            title={
              p.confirmFlags.me
                ? '✓ You confirmed — waiting for the other party'
                : '✓ Accept & Confirm This Schedule'
            }
            variant="primary"
            size="sm"
            onPress={p.onConfirm}
            disabled={p.confirmFlags.me}
            style={styles.confirmButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  panel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  proposalForm: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dateField: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  dateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  locationInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    fontSize: 14,
    color: colors.text,
  },
  confirmedBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  confirmedTitle: {
    fontWeight: '800',
    color: colors.success,
    fontSize: 14,
  },
  confirmedMeta: {
    fontSize: 13,
    color: colors.primaryDark,
    marginTop: 2,
  },
  pendingBox: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  pendingTitle: {
    fontWeight: '800',
    color: colors.warning,
    fontSize: 14,
  },
  pendingMeta: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  pendingSubmeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  confirmButton: {
    marginTop: 4,
  },
  messages: {
    padding: spacing.lg,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  mine: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  theirs: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: '#DCFCE7',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    transform: [{rotate: '180deg'}],
    marginTop: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
});
