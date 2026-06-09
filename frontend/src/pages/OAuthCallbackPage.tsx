/**
 * src/pages/OAuthCallbackPage.tsx
 * Handles the redirect back from Google OAuth. The backend places the access
 * token in the URL fragment (#access_token=...) and sets the refresh cookie.
 * We store the token, load the user, then route onward.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { setAccessToken, refreshUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hash.get('access_token');

    (async () => {
      if (!token) {
        toast.error('Google sign-in failed.');
        navigate('/login', { replace: true });
        return;
      }
      try {
        setAccessToken(token);
        await refreshUser();
        toast.success('Signed in with Google!');
        navigate('/dashboard', { replace: true });
      } catch {
        toast.error('Could not complete Google sign-in.');
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, setAccessToken, refreshUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <p className="text-sm text-muted">Completing sign-in…</p>
    </div>
  );
}
