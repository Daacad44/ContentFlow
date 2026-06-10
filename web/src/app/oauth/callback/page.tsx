'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/api';

/** Handles Google OAuth redirect: /oauth/callback#access_token=... */
export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('access_token');
    if (token) {
      tokenStore.set(token);
      router.replace('/complete-profile');
    } else {
      router.replace('/login?error=oauth_failed');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
