import {api} from './client';
import type {User} from './types';

type TokenResponse = {accessToken: string};

/** Backend signals whether this login provisioned the account (role selection). */
type AuthResponse = {accessToken: string; user: User; newUser?: boolean};

/**
 * Dev-mode login (backend issues a JWT without Firebase).
 * Phase 1 final step swaps this for:
 *   const idToken = await firebaseAuth().currentUser.getIdToken();
 *   api.post('/auth/verify-token', {idToken})
 */
export async function devLogin(email: string, name: string): Promise<AuthResponse> {
  const res = await api.post<TokenResponse & {newUser?: boolean}>(
    '/api/auth/dev/login',
    {email, name},
  );
  return completeLogin(res.data.accessToken, res.data.newUser);
}

/** Exchanges an external ID token (Firebase) for a backend JWT. */
export async function verifyToken(idToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/verify-token', {
    idToken,
  });
  // Older backends without the newUser field: fall back to role presence.
  const newUser = res.data.newUser ?? res.data.user.role == null;
  return {...res.data, newUser};
}

async function completeLogin(
  accessToken: string,
  newUser?: boolean,
): Promise<AuthResponse> {
  // fetch full profile with the fresh token
  const me = await api.get<User>('/api/users/me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return {
    accessToken,
    user: me.data,
    // Older backends without newUser: fall back to role presence.
    newUser: newUser ?? me.data.role == null,
  };
}
