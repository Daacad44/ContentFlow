/** src/pages/VerifyEmailPage.tsx — screen 05 from the design. */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { api, getApiErrorMessage } from '../lib/api';

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email;

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [resending, setResending] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        toast.success('Email verified!');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      } catch (err) {
        setStatus('error');
        toast.error(getApiErrorMessage(err, 'Verification failed.'));
      }
    })();
  }, [token, navigate]);

  const resend = async () => {
    if (!email) {
      toast.error('Enter your email on the login page to resend.');
      return;
    }
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification email sent.');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout illustration={<MailIllustration />}>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
          📨
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">
          {status === 'success' ? 'Email Verified ✅' : 'Verify Your Email 📩'}
        </h1>

        {status === 'verifying' && (
          <p className="mt-2 text-sm text-muted">Verifying your email, please wait…</p>
        )}

        {status === 'success' && (
          <p className="mt-2 text-sm text-muted">
            Your account is now active. Redirecting you to sign in…
          </p>
        )}

        {(status === 'idle' || status === 'error') && (
          <>
            <p className="mt-2 text-sm text-muted">
              We have sent a verification link to{' '}
              <span className="font-medium text-brand">{email ?? 'your email'}</span>.
            </p>
            <p className="mt-3 text-sm text-muted">
              Please check your inbox and click the verification link to activate your account.
            </p>

            <p className="mt-6 text-sm text-muted">Didn&apos;t receive the email?</p>
            <button
              onClick={resend}
              disabled={resending}
              className="cf-btn-ghost mt-2"
            >
              {resending ? 'Sending…' : '↻ Resend Email'}
            </button>
          </>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-muted hover:text-white"
        >
          ← Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}

function MailIllustration() {
  return (
    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" aria-hidden>
      <rect x="40" y="40" width="120" height="80" rx="10" fill="#0f1729" stroke="#1e2a44" />
      <path d="M40 50 100 90 160 50" stroke="#ff7a1a" strokeWidth="3" fill="none" />
      <circle cx="150" cy="46" r="14" fill="#ff7a1a" />
      <path d="M144 46l4 4 8-8" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
