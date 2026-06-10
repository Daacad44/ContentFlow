'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { RegisterIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OrDivider } from '@/components/auth/or-divider';
import { GoogleButton } from '@/components/auth/google-button';
import { register } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        confirmPassword,
        acceptTerms: true,
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to create account.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell illustration={<RegisterIllustration />}>
      <h1 className="text-2xl font-bold text-white">Create Your Account 🚀</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Join thousands of businesses today
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <form className="mt-6 space-y-3.5" onSubmit={onSubmit}>
        <Field label="Full name" htmlFor="fullName">
          <Input
            id="fullName"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>

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

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password.length >= 8 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1 flex-1 rounded-full bg-success" />
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <Check className="h-3 w-3" /> Strong
              </span>
            </div>
          )}
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword">
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>

        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="cursor-pointer font-normal leading-relaxed text-muted-foreground">
            I agree to the{' '}
            <span className="font-semibold text-primary">Terms of Service</span> and{' '}
            <span className="font-semibold text-primary">Privacy Policy</span>
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !acceptTerms}>
          {loading ? 'Creating…' : 'Create Account'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
