/**
 * src/components/AuthLayout.tsx
 * The branded two-panel auth shell from the ContentFlow design: a dark "brand"
 * panel on the left (logo, tagline, illustration) and the form card on the right.
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-ink-500/60 bg-ink-800/60 shadow-2xl md:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-ink-700 to-ink-900 p-10 md:flex">
          <Logo size="lg" />
          <div>
            <h2 className="text-3xl font-extrabold leading-tight text-white">
              Create. <span className="text-brand">Schedule.</span> Grow.
            </h2>
            <p className="mt-3 max-w-xs text-sm text-muted">
              All-in-one platform to create content with AI, schedule posts, publish
              everywhere and analyze performance.
            </p>
          </div>
          <div className="flex items-center justify-center py-6">
            {illustration ?? <DefaultIllustration />}
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center bg-ink-800/40 p-6 sm:p-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

function DefaultIllustration() {
  return (
    <svg width="220" height="150" viewBox="0 0 220 150" fill="none" aria-hidden>
      <rect x="10" y="20" width="200" height="120" rx="14" fill="#0f1729" stroke="#1e2a44" />
      <rect x="28" y="40" width="80" height="10" rx="5" fill="#1e2a44" />
      <rect x="28" y="60" width="140" height="8" rx="4" fill="#16203a" />
      <rect x="28" y="78" width="120" height="8" rx="4" fill="#16203a" />
      <rect x="28" y="104" width="70" height="20" rx="8" fill="#ff7a1a" />
      <circle cx="178" cy="50" r="16" fill="#ff7a1a" opacity="0.25" />
      <circle cx="178" cy="50" r="8" fill="#ff7a1a" />
    </svg>
  );
}
