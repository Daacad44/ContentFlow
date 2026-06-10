'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { ForgotIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPassword } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell illustration={<ForgotIllustration />}>
      <h1 className="text-2xl font-bold text-white">Forgot Password? 🔒</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Don&apos;t worry! It happens. Please enter your email address.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {sent ? (
        <div className="mt-7 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-slate-200">
          <p className="font-medium text-white">Check your inbox 📬</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for {email}, a reset link has been sent from{' '}
            <span className="text-primary">noreply@botandev.com</span>.
          </p>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={onSubmit}>
          <Field label="Email address" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          We will send a password reset link to your email address.
        </p>
      </div>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </AuthShell>
  );
}
