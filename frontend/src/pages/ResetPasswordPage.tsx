/** src/pages/ResetPasswordPage.tsx — reset password with 6-digit OTP. */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthLayout } from '../components/AuthLayout';
import { Field, PasswordField } from '../components/Field';
import { api, getApiErrorMessage } from '../lib/api';
import { passwordStrength } from '../lib/validation';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const checks = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Uppercase & lowercase' },
    { ok: /[0-9!@#$%^&*]/.test(password), label: 'Number or special character' },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, password, confirmPassword });
      setDone(true);
      toast.success('Password reset! Please log in.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white">Reset Your Password 🔑</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the reset code from your email and choose a new password.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {done ? (
        <div className="mt-7 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-slate-200">
          <p className="font-medium text-white">Password reset successfully ✅</p>
          <p className="mt-1 text-muted">Redirecting to sign in…</p>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={onSubmit} noValidate>
          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Reset code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-xl tracking-[0.35em] font-mono"
            required
          />
          <PasswordField
            label="New password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-xs">
                <span className={c.ok ? 'text-green-400' : 'text-muted'}>{c.ok ? '✓' : '○'}</span>
                <span className={c.ok ? 'text-slate-300' : 'text-muted'}>{c.label}</span>
              </li>
            ))}
          </ul>
          <PasswordField
            label="Confirm new password"
            placeholder="••••••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="submit"
            className="cf-btn-primary"
            disabled={loading || otp.length !== 6 || passwordStrength(password).score < 2}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-muted hover:text-white"
      >
        ← Back to login
      </Link>
    </AuthLayout>
  );
}
