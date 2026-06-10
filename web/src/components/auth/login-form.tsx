'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/layout/auth-shell';
import { LoginIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/auth/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OrDivider } from '@/components/auth/or-divider';
import { GoogleButton } from '@/components/auth/google-button';
import { login } from '@/lib/auth-api';
import { getApiErrorMessage } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError === 'oauth_failed') {
      setError('Google sign-in failed. Please try again.');
    } else if (oauthError === 'FORBIDDEN') {
      setError('This account has been deactivated.');
    } else if (oauthError) {
      setError('Sign-in failed. Please try again.');
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(email, password, rememberMe);
      router.push(user.profileComplete ? '/login' : '/complete-profile');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell illustration={<LoginIllustration />}>
      <h1 className="text-2xl font-bold text-white">Welcome Back 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

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

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
            />
            <Label htmlFor="remember" className="cursor-pointer font-normal text-muted-foreground">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
