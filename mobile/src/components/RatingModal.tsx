import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {ratePickup, type FoodRequest} from '../api/requests';

type Props = {
  claim: FoodRequest;
  onClose: () => void;
  onRated: () => void;
};

export function RatingModal({claim, onClose, onRated}: Props) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (stars < 1) {
      return;
    }
    setSubmitting(true);
    try {
      await ratePickup(claim.id, stars, comment.trim() || undefined);
      onRated();
      onClose();
    } catch (e) {
      Alert.alert(
        'Error',
        (e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ??
          'Could not submit rating',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate your pickup</Text>
          <Text style={styles.subtitle}>{claim.listingTitle}</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                <Text style={[styles.star, n <= stars && styles.starActive]}>
                  {n <= stars ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.comment}
            placeholder="Anything to say? (optional)"
            placeholderTextColor="#999"
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
              <Text style={styles.secondaryText}>Later</Text>
            </Pressable>
            <Pressable
              style={[styles.button, (stars < 1 || submitting) && styles.disabled]}
              disabled={stars < 1 || submitting}
              onPress={submit}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Submit</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
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
    marginTop: 4,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  star: {
    fontSize: 34,
    color: '#d5d5d5',
  },
  starActive: {
    color: '#f1a805',
  },
  comment: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
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
    backgroundColor: '#0b7a3e',
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
