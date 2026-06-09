import { ReactNode } from 'react';
import { BrandPanel } from './brand-panel';

/**
 * Two-panel auth card: brand panel (left) + form panel (right).
 * Used by all six screens to guarantee identical layout/spacing.
 */
export function AuthShell({
  illustration,
  children,
}: {
  illustration: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-[860px]">
      <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:grid-cols-2">
        <BrandPanel illustration={illustration} />
        <div className="flex flex-col justify-center p-7 sm:p-9">{children}</div>
      </div>
    </div>
  );
}
