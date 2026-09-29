import React, {useEffect, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary} from 'react-native-image-picker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/RootNavigator';
import {useAuthStore} from '../../store/authStore';
import {ROLE_LABELS} from '../../api/types';
import {
  myVerification,
  submitVerification,
  type Verification,
} from '../../api/verification';
import {uploadImage} from '../../api/listings';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {AppHeader} from '../../components/AppHeader';
import {AppButton} from '../../components/AppButton';
import {AppTextInput} from '../../components/AppTextInput';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({navigation}: Props) {
  const {user, saveProfile, logout, loading, error} = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // verification state
  const [verification, setVerification] = useState<Verification | null>(null);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);

  useEffect(() => {
    if (user && !user.verified) {
      myVerification().then(setVerification).catch(() => {});
    }
  }, [user]);

  if (!user) {
    return null;
  }

  function pickDocument() {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, async res => {
      const asset = res.assets?.[0];
      if (!asset?.uri) {
        return;
      }
      setDocUploading(true);
      try {
        const url = await uploadImage(asset.uri, asset.type ?? undefined);
        setDocUrl(url);
        Alert.alert('Uploaded', 'Document attached.');
      } catch {
        Alert.alert('Error', 'Could not upload the document');
      } finally {
        setDocUploading(false);
      }
    });
  }

  async function submitForVerification() {
    if (!orgName.trim() || !docUrl) {
      Alert.alert(
        'Missing info',
        'Organization name and a document photo are required.',
      );
      return;
    }
    setSubmittingDoc(true);
    try {
      const v = await submitVerification({
        orgName: orgName.trim(),
        orgType: orgType.trim() || undefined,
        registrationDocUrl: docUrl,
      });
      setVerification(v);
      setShowVerifyForm(false);
    } catch (e) {
      Alert.alert(
        'Error',
        (e as {response?: {data?: {detail?: string}}})?.response?.data
          ?.detail ?? 'Could not submit',
      );
    } finally {
      setSubmittingDoc(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Profile & Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View
              style={[
                styles.badge,
                user.verified ? styles.badgeVerified : styles.badgePending,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  user.verified ? styles.badgeTextVerified : styles.badgeTextPending,
                ]}>
                {user.verified ? '✓ Verified Account' : 'Unverified Account'}
              </Text>
            </View>
          </View>
        </View>

        {/* Role Preference Row */}
        <View style={styles.roleCard}>
          <View style={styles.roleTextGroup}>
            <Text style={styles.roleLabel}>Current Role</Text>
            <Text style={styles.roleValue}>{ROLE_LABELS[user.role]}</Text>
          </View>
          <AppButton
            title="Change Role"
            variant="outline"
            size="sm"
            // navigate (not replace): RoleSelect pops back here after the
            // role changes — replace left a [Home, RoleSelect] stack whose
            // submit then built a duplicate [Home, Home].
            onPress={() => navigation.navigate('RoleSelect')}
          />
        </View>

        {/* Two-Directional Rating Averages Card */}
        <Text style={styles.sectionTitle}>Rating Overview</Text>
        <View style={styles.ratingsCard}>
          <View style={styles.ratingStatItem}>
            <Text style={styles.ratingStatVal}>
              ⭐ {Number(user.ratingAvg ?? 0).toFixed(1)}
            </Text>
            <Text style={styles.ratingStatLabel}>Overall Rating</Text>
          </View>
          <View style={styles.ratingStatDivider} />
          <View style={styles.ratingStatItem}>
            <Text style={styles.ratingStatVal}>
              🍲 {Number(user.donorRatingAvg ?? 0).toFixed(1)}
            </Text>
            <Text style={styles.ratingStatLabel}>As Donor</Text>
          </View>
          <View style={styles.ratingStatDivider} />
          <View style={styles.ratingStatItem}>
            <Text style={styles.ratingStatVal}>
              🤝 {Number(user.recipientRatingAvg ?? 0).toFixed(1)}
            </Text>
            <Text style={styles.ratingStatLabel}>As Recipient</Text>
          </View>
        </View>

        {/* Edit Profile Form */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.formSection}>
          <AppTextInput
            label="Full Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />

          <AppTextInput
            label="Phone Number"
            placeholder="Your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            title="Save Profile Changes"
            variant="primary"
            loading={loading}
            onPress={() => saveProfile({name, phone})}
          />
        </View>

        {/* Verification Section */}
        {!user.verified && (
          <View style={styles.verifySection}>
            <Text style={styles.sectionTitle}>Account Verification</Text>
            {verification && verification.verificationStatus === 'PENDING' ? (
              <View style={[styles.verifyBox, styles.verifyPending]}>
                <Text style={styles.verifyTitle}>⏳ Under Review</Text>
                <Text style={styles.verifyMeta}>
                  We're reviewing "{verification.orgName}". Verification usually takes 1-2 business days.
                </Text>
              </View>
            ) : verification &&
              verification.verificationStatus === 'REJECTED' ? (
              <View style={[styles.verifyBox, styles.verifyRejected]}>
                <Text style={styles.verifyTitleRejected}>
                  ❌ Verification Needs Update
                </Text>
                <Text style={styles.verifyMeta}>
                  Your organization document was rejected. Please resubmit with clearer documents.
                </Text>
                <AppButton
                  title="Resubmit Document"
                  variant="outline"
                  size="sm"
                  onPress={() => setShowVerifyForm(true)}
                  style={{marginTop: 8}}
                />
              </View>
            ) : showVerifyForm ? (
              <View style={styles.verifyFormBox}>
                <AppTextInput
                  label="Organization Name"
                  placeholder="e.g. Dhaka Food Rescue NGO"
                  value={orgName}
                  onChangeText={setOrgName}
                  required
                />
                <AppTextInput
                  label="Organization Type"
                  placeholder="e.g. NGO, Restaurant, Shelter"
                  value={orgType}
                  onChangeText={setOrgType}
                />
                <AppButton
                  title={docUrl ? '✓ Document Attached' : 'Attach Registration Document'}
                  variant={docUrl ? 'secondary' : 'outline'}
                  size="sm"
                  loading={docUploading}
                  onPress={pickDocument}
                  style={{marginBottom: 12}}
                />
                <AppButton
                  title="Submit for Verification"
                  variant="primary"
                  loading={submittingDoc}
                  disabled={!orgName.trim() || !docUrl}
                  onPress={submitForVerification}
                />
              </View>
            ) : (
              <View style={styles.verifyPromptBox}>
                <Text style={styles.verifyPromptTitle}>
                  Get Verified for Higher Trust
                </Text>
                <Text style={styles.verifyPromptDesc}>
                  Verified organizations and individuals get priority listing and higher claim limits.
                </Text>
                <AppButton
                  title="Start Verification Process"
                  variant="secondary"
                  size="md"
                  onPress={() => setShowVerifyForm(true)}
                  style={{marginTop: 8}}
                />
              </View>
            )}
          </View>
        )}

        {/* Logout Button */}
        <AppButton
          title="Log Out"
          variant="danger"
          size="md"
          onPress={logout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  userMeta: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeVerified: {
    backgroundColor: colors.successLight,
  },
  badgePending: {
    backgroundColor: colors.warningLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextVerified: {
    color: colors.success,
  },
  badgeTextPending: {
    color: colors.warning,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  roleTextGroup: {
    gap: 2,
  },
  roleLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  roleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  ratingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  ratingStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  ratingStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  ratingStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  ratingStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  formSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  verifySection: {
    gap: spacing.md,
  },
  verifyBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  verifyPending: {
    backgroundColor: colors.warningLight,
    borderColor: '#FDE68A',
  },
  verifyRejected: {
    backgroundColor: colors.errorLight,
    borderColor: '#FCA5A5',
  },
  verifyTitle: {
    fontWeight: '800',
    color: colors.warning,
    fontSize: 15,
  },
  verifyTitleRejected: {
    fontWeight: '800',
    color: colors.error,
    fontSize: 15,
  },
  verifyMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  verifyFormBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  verifyPromptBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  verifyPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  verifyPromptDesc: {
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
  },
  logoutBtn: {
    marginTop: spacing.md,
  },
});
