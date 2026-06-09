import Link from 'next/link';
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

export default function LoginPage() {
  return (
    <AuthShell illustration={<LoginIllustration />}>
      <h1 className="text-2xl font-bold text-white">Welcome Back 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>

      <form className="mt-7 space-y-4">
        <Field label="Email address" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" placeholder="••••••••••••" />
        </Field>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" defaultChecked />
            <Label htmlFor="remember" className="cursor-pointer font-normal text-muted-foreground">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full">
          Sign In
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
