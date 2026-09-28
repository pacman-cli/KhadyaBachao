import * as Keychain from 'react-native-keychain';

// Every operation MUST target the same explicit service. The previous code
// saved with a username only and cleared with a bare resetGenericPassword(),
// which silently missed the stored entry — logout appeared to work but the
// Keychain token survived and the app auto-logged-in on relaunch.
const SERVICE = 'com.khadyabachao.auth';
const USERNAME = 'auth';

export type StoredCredentials = {
  accessToken: string;
  userId: string;
};

export async function saveCredentials(value: StoredCredentials): Promise<void> {
  await Keychain.setGenericPassword(USERNAME, JSON.stringify(value), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  const result = await Keychain.getGenericPassword({service: SERVICE});
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
  await Keychain.resetGenericPassword({service: SERVICE});
}
