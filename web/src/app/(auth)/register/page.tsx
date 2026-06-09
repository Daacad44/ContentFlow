import Link from 'next/link';
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

export default function RegisterPage() {
  return (
    <AuthShell illustration={<RegisterIllustration />}>
      <h1 className="text-2xl font-bold text-white">Create Your Account 🚀</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Join thousands of businesses today
      </p>

      <form className="mt-6 space-y-3.5">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" placeholder="John Doe" />
        </Field>

        <Field label="Email address" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" placeholder="••••••••••••" />
          {/* Password strength indicator */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              <span className="h-1 flex-1 rounded-full bg-success" />
              <span className="h-1 flex-1 rounded-full bg-success" />
              <span className="h-1 flex-1 rounded-full bg-success" />
              <span className="h-1 flex-1 rounded-full bg-success" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <Check className="h-3 w-3" /> Strong
            </span>
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirmPassword">
          <PasswordInput id="confirmPassword" placeholder="••••••••••••" />
        </Field>

        <div className="flex items-start gap-2 pt-1">
          <Checkbox id="terms" defaultChecked className="mt-0.5" />
          <Label htmlFor="terms" className="cursor-pointer font-normal leading-relaxed text-muted-foreground">
            I agree to the{' '}
            <span className="font-semibold text-primary">Terms of Service</span> and{' '}
            <span className="font-semibold text-primary">Privacy Policy</span>
          </Label>
        </div>

        <Button type="submit" className="w-full">
          Create Account
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
