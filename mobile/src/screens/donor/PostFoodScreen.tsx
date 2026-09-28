import React, {useEffect, useState, useRef} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker} from 'react-native-maps';
import {getCurrentCoords} from '../../utils/location';
import {useDateTimePicker} from '../../hooks/useDateTimePicker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {createListing, uploadImage, type FoodType} from '../../api/listings';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {AppTextInput} from '../../components/AppTextInput';
import {formatDateTime} from '../../utils/datetime';

const FOOD_TYPES: {value: FoodType; label: string; emoji: string}[] = [
  {value: 'COOKED', label: 'Cooked', emoji: '🍲'},
  {value: 'PACKAGED', label: 'Packaged', emoji: '📦'},
  {value: 'RAW', label: 'Raw', emoji: '🥦'},
];

const UNITS = ['plates', 'kg', 'packets'];

type Props = NativeStackScreenProps<RootStackParamList, 'PostFood'>;

export function PostFoodScreen({navigation}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('COOKED');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('plates');
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 2 * 3600 * 1000));
  // Android needs the two-step date→time flow (mode="datetime" is date-only
  // there); iOS uses the native datetime picker.
  const {open: openDeadlinePicker, picker: deadlinePicker} = useDateTimePicker(
    deadline,
    setDeadline,
  );
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<MapView>(null);

  // A half-filled listing (typed title, quantity, or uploaded photos that may
  // already be in R2) must not vanish on an accidental back swipe. Skipped
  // after a successful publish (navigation.replace also fires beforeRemove).
  const publishedRef = useRef(false);
  const hasDraft =
    title.trim().length > 0 || Number(quantity) > 0 || photoUrls.length > 0;
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!hasDraft || publishedRef.current) {
        return;
      }
      e.preventDefault();
      Alert.alert('Discard listing?', 'Your draft — including any uploaded photos — will be lost.', [
        {text: 'Keep editing', style: 'cancel'},
        {text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action)},
      ]);
    });
    return unsubscribe;
  }, [navigation, hasDraft]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const c = await getCurrentCoords();
      if (c) {
        setCoords(c);
        setShowMap(true);
        // initialRegion is only read on mount — without this animation the
        // camera stays wherever the user panned and a refresh looks broken.
        mapRef.current?.animateToRegion(
          {latitude: c.lat, longitude: c.lng, latitudeDelta: 0.01, longitudeDelta: 0.01},
          400,
        );
      }
    } finally {
      setLocating(false);
    }
  }

  async function pickPhoto() {
    try {
      const {launchImageLibrary} = require('react-native-image-picker');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 3 - photoUrls.length,
        // Audit M22/X2: downscale + compress on-device so camera photos stay
        // well under the server's 5MB upload limit (most raw camera shots are
        // 3-8MB and previously failed with an opaque server error).
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        includeBase64: false,
      });
      if (result.didCancel || !result.assets?.length) return;

      setUploading(true);
      for (const asset of result.assets) {
        if (!asset.uri) continue;
        try {
          // Reuse the shared upload helper instead of hand-rolling FormData.
          const url = await uploadImage(asset.uri, asset.type ?? undefined);
          setPhotoUrls(prev => [...prev, url]);
        } catch {
          Alert.alert('Upload failed', 'Could not upload photo.');
        }
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (!coords) {
      Alert.alert('Missing location', 'Attach a pickup location first.');
      return;
    }
    // The default deadline is computed once at mount — a form left open for a
    // couple of hours would silently publish a deadline already in the past.
    if (deadline.getTime() <= Date.now()) {
      Alert.alert(
        'Deadline passed',
        'The pickup deadline is already in the past — pick a new one.',
      );
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
        photoUrls,
      });
      publishedRef.current = true;
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
      <AppHeader
        title="Post Surplus Food"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <AppTextInput
              label="Listing Title"
              placeholder="e.g. 50 plates of fresh Biryani & salad"
              value={title}
              onChangeText={setTitle}
              required
            />

            <AppTextInput
              label="Description (Optional)"
              placeholder="Describe items, packaging, dietary info or dietary notes"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.multiline}
            />

            {/* Food Type Selector */}
            <Text style={styles.fieldLabel}>Food Type *</Text>
            <View style={styles.typeRow}>
              {FOOD_TYPES.map(t => (
                <Pressable
                  key={t.value}
                  style={[
                    styles.typeChip,
                    foodType === t.value && styles.typeChipActive,
                  ]}
                  onPress={() => setFoodType(t.value)}>
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      styles.typeText,
                      foodType === t.value && styles.typeTextActive,
                    ]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Quantity Row */}
            <Text style={styles.fieldLabel}>Quantity & Unit *</Text>
            <View style={styles.quantityRow}>
              <View style={styles.quantityInputWrap}>
                <AppTextInput
                  placeholder="e.g. 50"
                  value={quantity}
                  // decimal-pad keyboards emit "," on comma-locale devices;
                  // Number("2,5") is NaN which silently disabled Publish.
                  onChangeText={t => setQuantity(t.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  containerStyle={styles.noMarginBottom}
                />
              </View>
              <View style={styles.unitsRow}>
                {UNITS.map(u => (
                  <Pressable
                    key={u}
                    style={[
                      styles.unitChip,
                      unit === u && styles.unitChipActive,
                    ]}
                    onPress={() => setUnit(u)}>
                    <Text
                      style={[
                        styles.unitText,
                        unit === u && styles.unitTextActive,
                      ]}>
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Pickup Deadline */}
            <Text style={styles.fieldLabel}>Pickup Deadline *</Text>
            <Pressable
              style={styles.pickerButton}
              onPress={openDeadlinePicker}>
              <Text style={styles.pickerIcon}>⏰</Text>
              <Text style={styles.pickerText}>
                {formatDateTime(deadline)}
              </Text>
            </Pressable>
            {deadlinePicker}
          </View>

          {/* Photos & Location Card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Photos (Optional, up to 3)</Text>
            <View style={styles.photoContainer}>
              {photoUrls.map((url, idx) => (
                <View key={url + idx} style={styles.photoThumb}>
                  <Image source={{uri: url}} style={styles.photoImg} />
                  <Pressable
                    style={styles.photoRemove}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${idx + 1}`}
                    onPress={() => removePhoto(idx)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {photoUrls.length < 3 && (
                <Pressable
                  style={styles.photoAdd}
                  onPress={pickPhoto}
                  disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.photoAddPlus}>+</Text>
                      <Text style={styles.photoAddText}>Add Photo</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <Text style={styles.fieldLabel}>Pickup Location *</Text>
            <AppButton
              title={
                locating
                  ? 'Detecting Location...'
                  : coords
                    ? `Pinned (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) — Refresh`
                    : 'Pin My Current Location'
              }
              variant={coords ? 'secondary' : 'outline'}
              size="md"
              loading={locating}
              onPress={useCurrentLocation}
            />

            {showMap && coords && (
              <View style={styles.mapContainer}>
                <Text style={styles.mapHint}>📍 Drag pin to adjust exact pickup spot</Text>
                <MapView
                  ref={mapRef}
                  style={styles.mapView}
                  initialRegion={{
                    latitude: coords.lat,
                    longitude: coords.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={e => setCoords({lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude})}>
                  <Marker
                    draggable
                    coordinate={{latitude: coords.lat, longitude: coords.lng}}
                    onDragEnd={e => setCoords({lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude})}
                    title="Pickup Location"
                  />
                </MapView>
              </View>
            )}
          </View>

          {/* Submit Action */}
          <AppButton
            title="Publish Food Listing"
            variant="primary"
            size="lg"
            disabled={!valid || saving}
            loading={saving}
            onPress={submit}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.massive,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  multiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  typeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.primaryDark,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quantityInputWrap: {
    width: 110,
  },
  noMarginBottom: {
    marginBottom: 0,
  },
  unitsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  unitChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.primaryDark,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  pickerIcon: {
    fontSize: 18,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  photoAddPlus: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '700',
  },
  photoAddText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  mapContainer: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapHint: {
    fontSize: 11,
    color: colors.textSecondary,
    padding: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    textAlign: 'center',
    fontWeight: '600',
  },
  mapView: {
    width: '100%',
    height: 180,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
