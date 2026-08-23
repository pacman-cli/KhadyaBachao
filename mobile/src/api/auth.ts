import {api} from './client';
import type {User} from './types';

type TokenResponse = {accessToken: string};

type AuthResponse = {accessToken: string; user: User};

/**
 * Dev-mode login (backend issues a JWT without Firebase).
 * Phase 1 final step swaps this for:
 *   const idToken = await firebaseAuth().currentUser.getIdToken();
 *   api.post('/auth/verify-token', {idToken})
 */
export async function devLogin(email: string, name: string): Promise<AuthResponse> {
  const res = await api.post<TokenResponse>('/api/auth/dev/login', {
    email,
    name,
  });
  return completeLogin(res.data.accessToken);
}

/** Exchanges an external ID token (Firebase) for a backend JWT. */
export async function verifyToken(idToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/verify-token', {
    idToken,
  });
  return res.data;
}

async function completeLogin(accessToken: string): Promise<AuthResponse> {
  // fetch full profile with the fresh token
  const me = await api.get<User>('/api/users/me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return {accessToken, user: me.data};
}
