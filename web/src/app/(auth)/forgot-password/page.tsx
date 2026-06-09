import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { ForgotIllustration } from '@/components/illustrations';
import { Field } from '@/components/auth/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <AuthShell illustration={<ForgotIllustration />}>
      <h1 className="text-2xl font-bold text-white">Forgot Password? 🔒</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Don&apos;t worry! It happens. Please enter your email address.
      </p>

      <form className="mt-7 space-y-4">
        <Field label="Email address" htmlFor="email">
          <Input id="email" type="email" placeholder="you@example.com" />
        </Field>

        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>
      </form>

      {/* Information alert box */}
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
