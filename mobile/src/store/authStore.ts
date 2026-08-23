import {create} from 'zustand';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import type {User, UserRole} from '../api/types';
import {setToken} from '../api/tokenRef';
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
    } catch {
      await clearCredentials();
      set({user: null, token: null, initializing: false});
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
        awaitingRoleSelection: true,
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
    set({loading: true, error: null});
    try {
      const user = await usersApi.updateProfile(input);
      set({user, loading: false});
      return true;
    } catch (e) {
      set({error: describe(e), loading: false});
      return false;
    }
  },

  logout: async () => {
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
