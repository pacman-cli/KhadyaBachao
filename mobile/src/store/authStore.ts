import {create} from 'zustand';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import type {User, UserRole} from '../api/types';
import {setToken} from '../api/tokenRef';
import {deactivateSocket} from '../api/wsClient';
import {signOutFirebase} from '../services/firebaseAuthService';
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from '../utils/secureStorage';

type AuthState = {
  user: User | null;
  token: string | null;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  /** true right after first login until the user picks a role */
  awaitingRoleSelection: boolean;

  bootstrap: () => Promise<void>;
  devLogin: (email: string, name: string) => Promise<boolean>;
  firebaseLogin: (idToken: string) => Promise<boolean>;
  selectRole: (role: UserRole) => Promise<boolean>;
  saveProfile: (input: {name?: string; phone?: string}) => Promise<boolean>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  token: null,
  initializing: true,
  loading: false,
  error: null,
  awaitingRoleSelection: false,

  bootstrap: async () => {
    try {
      const stored = await loadCredentials();
      if (!stored) {
        set({initializing: false});
        return;
      }
      // validate the stored token is still usable
      setToken(stored.accessToken);
      const me = await usersApi.getMe();
      set({user: me, token: stored.accessToken, initializing: false});
    } catch (e: any) {
      // Only a server REJECTION (401/403) means the token is dead. Offline
      // launches / backend restarts / timeouts must keep the stored session —
      // wiping it permanently logged users out over a transient network blip.
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        await clearCredentials();
        setToken(null);
        set({user: null, token: null, initializing: false});
      } else {
        set({initializing: false});
      }
    }
  },

  devLogin: async (email, name) => {
    set({loading: true, error: null});
    try {
      const res = await authApi.devLogin(email, name);
      setToken(res.accessToken);
      await saveCredentials({
        accessToken: res.accessToken,
        userId: res.user.id,
      });
      set({
        user: res.user,
        token: res.accessToken,
        loading: false,
        // Audit M16: only first-time users are pushed through role selection;
        // returning users go straight to the app.
        awaitingRoleSelection: res.newUser === true,
      });
      return true;
    } catch (e) {
      set({error: describe(e), loading: false});
      return false;
    }
  },

  firebaseLogin: async idToken => {
    set({loading: true, error: null});
    try {
      const res = await authApi.verifyToken(idToken);
      setToken(res.accessToken);
      await saveCredentials({
        accessToken: res.accessToken,
        userId: res.user.id,
      });
      set({
        user: res.user,
        token: res.accessToken,
        loading: false,
        // Audit M16: only first-time users are pushed through role selection;
        // returning users go straight to the app.
        awaitingRoleSelection: res.newUser === true,
      });
      return true;
    } catch (e) {
      set({error: describe(e), loading: false});
      return false;
    }
  },

  selectRole: async role => {
    set({loading: true, error: null});
    try {
      const user = await usersApi.updateRole(role);
      set({user, loading: false, awaitingRoleSelection: false});
      return true;
    } catch (e) {
      set({error: describe(e), loading: false});
      return false;
    }
  },

  saveProfile: async input => {
    const name = input.name?.trim();
    if (name !== undefined && name.length === 0) {
      set({error: 'Name cannot be empty', loading: false});
      return false;
    }
    set({loading: true, error: null});
    try {
      const user = await usersApi.updateProfile({name, phone: input.phone});
      set({user, loading: false});
      return true;
    } catch (e) {
      set({error: describe(e), loading: false});
      return false;
    }
  },

  logout: async () => {
    // Audit M12/M17: tear down the socket and the Firebase session too — a
    // lingering WS connection or Firebase session belongs to the logged-out
    // user just as much as the Keychain token does.
    await deactivateSocket().catch(() => undefined);
    await signOutFirebase().catch(() => undefined);
    await clearCredentials();
    setToken(null);
    set({user: null, token: null, error: null});
  },
}));

function describe(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const data = (e as {response?: {data?: {detail?: string}}}).response?.data;
    if (data?.detail) {
      return data.detail;
    }
  }
  return 'Something went wrong. Check your connection and API URL.';
}
