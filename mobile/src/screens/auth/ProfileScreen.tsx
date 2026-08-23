import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
        const url = await uploadImage(asset.uri);
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>{user.email}</Text>
          </View>
          <View
            style={[
              styles.badge,
              user.verified ? styles.badgeVerified : styles.badgePending,
            ]}>
            <Text style={styles.badgeText}>
              {user.verified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
        </View>

        <View style={styles.roleRow}>
          <Text style={styles.roleLabel}>Role:</Text>
          <Text style={styles.roleValue}>{ROLE_LABELS[user.role]}</Text>
          <Pressable onPress={() => navigation.replace('RoleSelect')}>
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Edit profile</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={() => saveProfile({name, phone})}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
        </Pressable>

        {!user.verified && (
          <>
            <Text style={styles.sectionTitle}>Verification</Text>
            {verification && verification.verificationStatus === 'PENDING' ? (
              <View style={[styles.verifyBox, styles.verifyPending]}>
                <Text style={styles.verifyTitle}>Under review</Text>
                <Text style={styles.verifyMeta}>
                  We're checking "{verification.orgName}". This usually takes a
                  day or two.
                </Text>
              </View>
            ) : verification &&
              verification.verificationStatus === 'REJECTED' ? (
              <View style={[styles.verifyBox, styles.verifyRejected]}>
                <Text style={styles.verifyTitleRejected}>
                  Verification rejected
                </Text>
                <Text style={styles.verifyMeta}>
                  You can update your details and resubmit.
                </Text>
                <Pressable
                  style={styles.panelButton}
                  onPress={() => setShowVerifyForm(true)}>
                  <Text style={styles.panelButtonText}>Resubmit</Text>
                </Pressable>
              </View>
            ) : showVerifyForm ? (
              <View style={styles.verifyBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Organization name"
                  placeholderTextColor="#999"
                  value={orgName}
                  onChangeText={setOrgName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Type (NGO, Restaurant, Shelter…)"
                  placeholderTextColor="#999"
                  value={orgType}
                  onChangeText={setOrgType}
                />
                <Pressable
                  style={styles.docButton}
                  disabled={docUploading}
                  onPress={pickDocument}>
                  {docUploading ? (
                    <ActivityIndicator size="small" color="#0b7a3e" />
                  ) : (
                    <Text style={styles.docButtonText}>
                      {docUrl ? '✓ Document attached — tap to replace' : 'Attach registration document (photo)'}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.button,
                    (!orgName.trim() || !docUrl || submittingDoc) &&
                      styles.buttonDisabled,
                  ]}
                  disabled={!orgName.trim() || !docUrl || submittingDoc}
                  onPress={submitForVerification}>
                  {submittingDoc ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit for review</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.panelButton}
                onPress={() => setShowVerifyForm(true)}>
                <Text style={styles.panelButtonText}>
                  Get verified (builds trust with donors)
                </Text>
              </Pressable>
            )}
          </>
        )}

        <Pressable style={[styles.button, styles.logout]} onPress={logout}>
          <Text style={[styles.buttonText, styles.logoutText]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  meta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeVerified: {
    backgroundColor: '#e6f6ec',
  },
  badgePending: {
    backgroundColor: '#fdf1d6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b7a3e',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  roleLabel: {
    fontSize: 14,
    color: '#666',
  },
  roleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  changeLink: {
    fontSize: 14,
    color: '#0b7a3e',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 28,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
  logout: {
    backgroundColor: '#f5f5f5',
  },
  logoutText: {
    color: '#c0392b',
  },
  verifyBox: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#fafafa',
  },
  verifyPending: {
    backgroundColor: '#fdf1d6',
    borderColor: '#ecd9a0',
  },
  verifyRejected: {
    backgroundColor: '#fdeaea',
    borderColor: '#eec3c3',
  },
  verifyTitle: {
    fontWeight: '800',
    color: '#9a6b00',
  },
  verifyTitleRejected: {
    fontWeight: '800',
    color: '#c0392b',
  },
  verifyMeta: {
    fontSize: 13,
    color: '#555',
  },
  panelButton: {
    backgroundColor: '#0b7a3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  panelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  docButton: {
    borderWidth: 1,
    borderColor: '#0b7a3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  docButtonText: {
    color: '#0b7a3e',
    fontWeight: '600',
    fontSize: 13,
  },
  error: {
    color: '#c0392b',
    marginBottom: 8,
    textAlign: 'center',
  },
});
