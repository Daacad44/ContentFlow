import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { ResetIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';

const RULES = [
  'At least 8 characters',
  'Contains uppercase & lowercase',
  'Contains number or special character',
];

export default function ResetPasswordPage() {
  return (
    <AuthShell illustration={<ResetIllustration />}>
      <h1 className="text-2xl font-bold text-white">Reset Your Password 🔑</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a new password for your account.
      </p>

      <form className="mt-7 space-y-4">
        <Field label="New password" htmlFor="newPassword">
          <PasswordInput id="newPassword" placeholder="••••••••••••" />
        </Field>

        {/* Password validation indicators */}
        <ul className="space-y-2">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {rule}
            </li>
          ))}
        </ul>

        <Field label="Confirm new password" htmlFor="confirmPassword">
          <PasswordInput id="confirmPassword" placeholder="••••••••••••" />
        </Field>

        <Button type="submit" className="w-full">
          Reset Password
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </AuthShell>
  );
}
