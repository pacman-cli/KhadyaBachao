import axios, {type AxiosError, type InternalAxiosRequestConfig} from 'axios';
import Config from 'react-native-config';
import {clearCredentials} from '../utils/secureStorage';
import {getToken, setToken} from './tokenRef';

export const API_BASE_URL = Config.API_BASE_URL ?? 'http://10.0.2.2:8080';

// Audit M9: a release build silently talking to a cleartext default URL is a
// misconfiguration — fail loudly instead of shipping an app that cannot work.
if (typeof __DEV__ !== 'undefined' && !__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(
    'API_BASE_URL must use https in release builds (got: ' + API_BASE_URL + '). ' +
      'Configure it via .env / build config.',
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Audit M8: on a hard auth failure the Keychain must be cleared too —
 * otherwise the next bootstrap() resurrects the dead token and the user is
 * stuck in a 401 loop until the token expires.
 */
type AuthFailureListener = () => void;
let authFailureListener: AuthFailureListener | null = null;

/** Registers the callback invoked when the session becomes unrecoverable. */
export function setOnAuthFailure(listener: AuthFailureListener | null): void {
  authFailureListener = listener;
}

type RetriableConfig = InternalAxiosRequestConfig & {_retry?: boolean};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const token = getToken();
  if (!token) {
    return null;
  }
  try {
    // Direct axios call (no interceptors) so a failing refresh cannot recurse.
    const res = await axios.post(
      `${API_BASE_URL}/api/auth/refresh`,
      null,
      {headers: {Authorization: `Bearer ${token}`}, timeout: 15000},
    );
    const newToken: unknown = res.data?.accessToken;
    if (typeof newToken === 'string' && newToken.length > 0) {
      setToken(newToken);
      return newToken;
    }
    return null;
  } catch (e) {
    // Only a server REJECTION (401/403) means the session is truly dead.
    // Offline/timeouts/5xx must keep the stored session — the user retries
    // when connectivity returns instead of being force-logged-out.
    const status = (e as AxiosError).response?.status;
    if (status === 401 || status === 403) {
      return null;
    }
    throw e;
  }
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      config &&
      !config._retry &&
      !config.url?.includes('/api/auth/refresh') &&
      !config.url?.includes('/api/auth/dev/login')
    ) {
      config._retry = true;

      // Single-flight: concurrent 401s share one refresh attempt. A network
      // failure during refresh rethrows the original error WITHOUT clearing
      // the session (transient ≠ dead token).
      refreshPromise = refreshPromise ?? refreshAccessToken();
      let newToken: string | null = null;
      try {
        newToken = await refreshPromise.finally(() => {
          refreshPromise = null;
        });
      } catch {
        throw error;
      }

      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(config);
      }

      setToken(null);
      try {
        await clearCredentials();
      } finally {
        authFailureListener?.();
      }
    }

    return Promise.reject(error);
  },
);
