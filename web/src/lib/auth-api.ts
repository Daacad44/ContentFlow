import { apiFetch, tokenStore } from './api';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
}) {
  return apiFetch<{ user: PublicUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyOtp(email: string, otp: string) {
  const res = await apiFetch<{ user: PublicUser; accessToken: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  tokenStore.set(res.data.accessToken);
  return res.data;
}

export async function login(email: string, password: string, rememberMe = false) {
  const res = await apiFetch<{ user: PublicUser; accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  });
  tokenStore.set(res.data.accessToken);
  return res.data;
}

export async function forgotPassword(email: string) {
  return apiFetch<null>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}) {
  return apiFetch<null>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function resendVerification(email: string) {
  return apiFetch<null>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function updateProfile(input: {
  fullName?: string;
  companyName?: string | null;
  timezone?: string;
}) {
  return apiFetch<{ user: PublicUser }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getMe() {
  return apiFetch<{ user: PublicUser }>('/auth/me');
}
