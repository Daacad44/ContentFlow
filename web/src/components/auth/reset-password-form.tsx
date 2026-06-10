'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { ResetIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { resetPassword } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

const RULES = [
  'At least 8 characters',
  'Contains uppercase & lowercase',
  'Contains number or special character',
];

export function ResetPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9!@#$%^&*]/.test(password),
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword({ email, otp, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell illustration={<ResetIllustration />}>
      <h1 className="text-2xl font-bold text-white">Reset Your Password 🔑</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the reset code from your email and choose a new password.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {done ? (
        <div className="mt-7 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
          <p className="font-medium text-white">Password reset successfully ✅</p>
          <Link href="/login" className="mt-2 inline-block font-semibold text-primary hover:underline">
            Sign in with your new password
          </Link>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={onSubmit}>
          <Field label="Email address" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Reset code" htmlFor="otp">
            <Input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-xl tracking-[0.35em] font-mono"
              required
            />
          </Field>

          <Field label="New password" htmlFor="newPassword">
            <PasswordInput
              id="newPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <ul className="space-y-2">
            {RULES.map((rule, i) => (
              <li key={rule} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className={`h-4 w-4 ${checks[i] ? 'text-success' : 'text-muted-foreground/40'}`} />
                {rule}
              </li>
            ))}
          </ul>

          <Field label="Confirm new password" htmlFor="confirmPassword">
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6 || !checks.every(Boolean)}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </AuthShell>
  );
}
