import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Geolocation from 'react-native-geolocation-service';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {createListing, type FoodType} from '../../api/listings';
import {API_BASE_URL} from '../../api/client';

const FOOD_TYPES: {value: FoodType; label: string}[] = [
  {value: 'COOKED', label: 'Cooked'},
  {value: 'PACKAGED', label: 'Packaged'},
  {value: 'RAW', label: 'Raw'},
];

const UNITS = ['kg', 'plates', 'packets'];

type Props = NativeStackScreenProps<RootStackParamList, 'PostFood'>;

export function PostFoodScreen({navigation}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('COOKED');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('plates');
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 2 * 3600 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  function useCurrentLocation() {
    setLocating(true);
    Geolocation.getCurrentPosition(
      pos => {
        setCoords({lat: pos.coords.latitude, lng: pos.coords.longitude});
        setLocating(false);
      },
      err => {
        setLocating(false);
        Alert.alert('Location failed', err.message);
      },
      {enableHighAccuracy: true, timeout: 15000},
    );
  }

  async function submit() {
    if (!coords) {
      Alert.alert('Missing location', 'Attach a pickup location first.');
      return;
    }
    setSaving(true);
    try {
      await createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        foodType,
        quantityValue: Number(quantity),
        quantityUnit: unit,
        pickupDeadline: deadline.toISOString(),
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        photoUrls: [],
      });
      navigation.replace('MyListings');
    } catch (e) {
      const detail =
        (e as {response?: {data?: {detail?: string}}})?.response?.data?.detail ??
        'Could not post listing';
      Alert.alert('Error', detail);
    } finally {
      setSaving(false);
    }
  }

  const valid =
    title.trim().length > 2 && Number(quantity) > 0 && coords !== null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Post surplus food</Text>

          <TextInput
            style={styles.input}
            placeholder="What food is it? (e.g. Rice & curry)"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Short description (optional)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Food type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FOOD_TYPES.map(t => (
              <Pressable
                key={t.value}
                style={[styles.chip, foodType === t.value && styles.chipActive]}
                onPress={() => setFoodType(t.value)}>
                <Text
                  style={[
                    styles.chipText,
                    foodType === t.value && styles.chipTextActive,
                  ]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              placeholder="50"
              placeholderTextColor="#999"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
            {UNITS.map(u => (
              <Pressable
                key={u}
                style={[styles.chip, unit === u && styles.chipActive]}
                onPress={() => setUnit(u)}>
                <Text
                  style={[
                    styles.chipText,
                    unit === u && styles.chipTextActive,
                  ]}>
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Pickup deadline</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.pickerText}>
              {deadline.toLocaleString()}
            </Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={deadline}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(_e, d) => {
                setShowPicker(Platform.OS === 'ios');
                if (d) {
                  setDeadline(d);
                }
              }}
            />
          )}

          <Text style={styles.label}>Pickup location</Text>
          <Pressable style={styles.locationButton} onPress={useCurrentLocation}>
            <Text style={styles.locationButtonText}>
              {locating
                ? 'Locating…'
                : coords
                  ? `Pinned at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} — tap to refresh`
                  : 'Use my current location'}
            </Text>
          </Pressable>
          {!coords && !locating && (
            <Text style={styles.hint}>
              Map pin picker arrives with Phase 3. For now we pin your GPS
              position.
            </Text>
          )}

          <Pressable
            style={[styles.button, !valid && styles.buttonDisabled]}
            disabled={!valid || saving}
            onPress={submit}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Post listing</Text>
            )}
          </Pressable>
          <Text style={styles.note}>{API_BASE_URL}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  chipActive: {
    backgroundColor: '#0b7a3e',
    borderColor: '#0b7a3e',
  },
  chipText: {
    fontSize: 14,
    color: '#444',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    width: 100,
    marginBottom: 0,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  pickerText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  locationButton: {
    borderWidth: 1,
    borderColor: '#0b7a3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#0b7a3e',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#0b7a3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 26,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  note: {
    marginTop: 12,
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
  },
});
