import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/** Label-over-input field wrapper to keep spacing identical across screens. */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
