/**
 * API client for the ContentFlow backend.
 * Sends credentials so the httpOnly refresh cookie (on :4000) is included.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiSuccess<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;

  if (!res.ok || !json.success) {
    const err = json as ApiErrorBody;
    const detail = err.error?.details?.[0]?.message;
    throw new Error(detail ?? err.error?.message ?? 'Request failed');
  }

  return json as ApiSuccess<T>;
}

export function getApiUrl(): string {
  return API_URL;
}

export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
