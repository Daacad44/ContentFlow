/**
 * src/components/AuthLayout.tsx
 * Module 01 — Authentication layout per ContentFlow design reference.
 */
import { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({
  children,
  illustration,
}: {
  children: ReactNode;
  illustration?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cf-bg px-4 py-8 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-cf-border bg-cf-surface md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-cf-navy-900 p-10 md:flex">
          <Logo size="lg" />
          <div>
            <h2 className="text-3xl font-bold leading-tight text-cf-text">Welcome Back</h2>
            <p className="mt-3 max-w-xs text-sm text-cf-muted">
              Sign in to your ContentFlow account to manage your social media automation.
            </p>
          </div>
          <div className="flex items-center justify-center py-6">
            {illustration ?? <ShieldIllustration />}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center p-6 sm:p-10">
          <div className="w-full min-w-0 max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ShieldIllustration() {
  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-full border border-cf-border bg-cf-navy-800">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
        <path
          d="M32 8L12 16v16c0 12.15 8.55 23.49 20 26 11.45-2.51 20-13.85 20-26V16L32 8z"
          stroke="#D97706"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M32 22l-6 6 6 6 10-10"
          stroke="#D97706"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="28" r="3" fill="#D97706" />
      </svg>
    </div>
  );
}
