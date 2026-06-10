'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { VerifyIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { verifyOtp, resendVerification } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

export function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const initialEmail = params.get('email') ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      setSuccess(true);
      setTimeout(() => router.push('/complete-profile'), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Verification failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Enter your email address first.');
      return;
    }
    setResending(true);
    setError('');
    try {
      await resendVerification(email);
      setMessage('A new verification code was sent to your email.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell illustration={<VerifyIllustration />}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Mail className="h-9 w-9 text-white" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">
          {success ? 'Email Verified ✅' : 'Verify Your Email 📧'}
        </h1>

        {success ? (
          <p className="mt-2 text-sm text-muted-foreground">Redirecting you…</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-primary">noreply@botandev.com</span> from
              BotanDev
            </p>

            {error && (
              <p className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-4 w-full rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                {message}
              </p>
            )}

            <form className="mt-6 w-full space-y-4 text-left" onSubmit={handleVerify}>
              <Field label="Email address" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Verification code" htmlFor="otp">
                <Input
                  id="otp"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-[0.4em] font-mono"
                  required
                />
              </Field>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Verify Email'}
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">Didn&apos;t receive the code?</p>
            <Button
              type="button"
              variant="google"
              className="mt-2 w-full"
              onClick={handleResend}
              disabled={resending}
            >
              <RefreshCw className="h-4 w-4" />
              {resending ? 'Sending…' : 'Resend Code'}
            </Button>
          </>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </AuthShell>
  );
}
