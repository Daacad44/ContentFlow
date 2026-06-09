import Link from 'next/link';
import { ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { AuthShell } from '@/components/layout/auth-shell';
import { VerifyIllustration } from '@/components/illustrations';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  return (
    <AuthShell illustration={<VerifyIllustration />}>
      <div className="flex flex-col items-center text-center">
        {/* Email verification icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary">
          <Mail className="h-9 w-9 text-white" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">Verify Your Email 📧</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          We have sent a verification link to
        </p>
        <p className="text-sm font-semibold text-primary">you@example.com</p>

        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Please check your inbox and click the verification link to activate your
          account.
        </p>

        <p className="mt-7 text-sm text-muted-foreground">Didn&apos;t receive the email?</p>
        <Button type="button" variant="google" className="mt-2 w-full">
          <RefreshCw className="h-4 w-4" />
          Resend Email
        </Button>

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
