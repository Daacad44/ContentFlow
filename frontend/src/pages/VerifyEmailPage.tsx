/** src/pages/VerifyEmailPage.tsx — OTP email verification (6-digit code). */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field } from '../components/Field';
import { api, getApiErrorMessage, tokenStore } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const emailFromQuery = params.get('email') ?? '';
  const emailFromState = (location.state as { email?: string })?.email ?? '';
  const [email, setEmail] = useState(emailFromQuery || emailFromState);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      tokenStore.set(data.data.accessToken);
      await refreshUser();
      setSuccess(true);
      toast.success('Email verified!');
      setTimeout(() => navigate('/complete-profile', { replace: true }), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/resend-verification', { email });
      setMessage('A new verification code was sent to your email.');
      toast.success('Verification code sent.');
    } catch (err) {
      setError(getApiErrorMessage(err));
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
          {success ? 'Email Verified ✅' : 'Verify Your Email 📩'}
        </h1>

        {success ? (
          <p className="mt-2 text-sm text-muted">Redirecting you…</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-brand">{email || 'your email'}</span>
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                {message}
              </p>
            )}

            <form className="mt-6 space-y-4 text-left" onSubmit={verify}>
              <Field
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Field
                label="Verification code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-[0.35em] font-mono"
                required
              />
              <button
                type="submit"
                className="cf-btn-primary w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted">Didn&apos;t receive the code?</p>
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="cf-btn-ghost mt-2 w-full"
            >
              {resending ? 'Sending…' : '↻ Resend Code'}
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
