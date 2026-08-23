import * as Keychain from 'react-native-keychain';

const KEY = 'com.khadyabachao.auth';

export type StoredCredentials = {
  accessToken: string;
  userId: string;
};

export async function saveCredentials(value: StoredCredentials): Promise<void> {
  await Keychain.setGenericPassword(KEY, JSON.stringify(value), {
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  const result = await Keychain.getGenericPassword();
  if (!result) {
    return null;
  }
  try {
    return JSON.parse(result.password) as StoredCredentials;
  } catch {
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  await Keychain.resetGenericPassword();
}
