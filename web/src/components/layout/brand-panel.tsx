import { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/logo';

/** Left brand panel shared by every auth screen. */
export function BrandPanel({ illustration }: { illustration: ReactNode }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden rounded-l-2xl bg-gradient-to-br from-[#0c1426] to-[#060d1c] p-8 md:flex">
      <BrandLogo />
      <p className="mt-6 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
        All-in-one platform to create content with AI, schedule posts, publish
        everywhere and analyze performance.
      </p>
      <div className="mt-8 flex flex-1 items-end justify-center pb-2">
        {illustration}
      </div>
    </div>
  );
}
