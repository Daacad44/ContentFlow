/**
 * src/lib/api.ts
 * Axios instance with automatic access-token attachment and transparent refresh.
 *
 *  - The access token lives in memory only (never localStorage) to reduce XSS
 *    blast radius. The refresh token is an httpOnly cookie managed by the API.
 *  - On a 401, we attempt a single refresh and replay the original request.
 *    Concurrent 401s are queued behind one refresh call.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// --- Refresh queue handling ------------------------------------------------
let isRefreshing = false;
let pending: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  pending.forEach((cb) => cb(token));
  pending = [];
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = data?.data?.accessToken ?? null;
    tokenStore.set(token);
    return token;
  } catch {
    tokenStore.set(null);
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const url = original?.url ?? '';

    // Do not try to refresh for the auth endpoints themselves.
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/register');

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push((token) => {
            if (!token) return reject(error);
            original.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;
      const token = await refreshAccessToken();
      isRefreshing = false;
      onRefreshed(token);

      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`);
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

/** Extracts a human-friendly message from an Axios error. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string; details?: Array<{ message: string }> } }
      | undefined;
    if (data?.error?.details?.length) return data.error.details[0].message;
    if (data?.error?.message) return data.error.message;
    if (err.message) return err.message;
  }
  return fallback;
}
