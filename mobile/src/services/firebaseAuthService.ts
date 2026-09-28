import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithCredential,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  GoogleAuthProvider,
  getIdToken,
  signOut as firebaseSignOut,
  UserCredential,
  ConfirmationResult,
} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';

try {
  GoogleSignin.configure({
    webClientId:
      Config.GOOGLE_WEB_CLIENT_ID ||
      '229944207916-web-client-id.apps.googleusercontent.com',
  });
} catch {
  // Gracefully handle unconfigured Google Sign-In native module
}

export async function signUpWithEmailPassword(
  email: string,
  pass: string,
): Promise<UserCredential> {
  const auth = getAuth();
  return await createUserWithEmailAndPassword(auth, email, pass);
}

export async function signInWithEmailPassword(
  email: string,
  pass: string,
): Promise<UserCredential> {
  const auth = getAuth();
  return await firebaseSignInWithEmailAndPassword(auth, email, pass);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In failed: missing ID Token');
  }
  const auth = getAuth();
  const googleCredential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, googleCredential);
}

export async function signInWithPhoneNumber(
  phoneNumber: string,
): Promise<ConfirmationResult> {
  const auth = getAuth();
  return await firebaseSignInWithPhoneNumber(auth, phoneNumber);
}

export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<UserCredential> {
  return await confirmationResult.confirm(code);
}

export async function getCurrentFirebaseIdToken(): Promise<string | null> {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  return await getIdToken(currentUser, true);
}

export async function signOutFirebase(): Promise<void> {
  // Revoke the Google OAuth grant too. Without this, Play Services
  // silently re-issues the previous account on the next "Sign in with
  // Google" tap — the user could never actually switch accounts after
  // logging out. revokeAccess() forces the account picker next time; it
  // throws when no grant exists, which must not block the sign-out.
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch {
    // No prior Google grant or Play Services unavailable — nothing to revoke.
  }
  const auth = getAuth();
  await firebaseSignOut(auth);
}
