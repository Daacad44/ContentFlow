import { CfMark } from './cf-mark';
import { cn } from '@/lib/utils';

/** Sidebar logo lockup: mark + wordmark + tagline subtitle. */
export function SidebarLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <CfMark size={34} />
      <div className="leading-tight">
        <div className="text-[17px] font-bold tracking-tight text-white">
          ContentFlow
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
          AI-Powered Social Media Automation
        </div>
      </div>
    </div>
  );
}

/** Brand-panel logo lockup: large mark, wordmark, and the locked tagline. */
export function BrandLogo() {
  return (
    <div>
      <CfMark size={46} />
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
        ContentFlow
      </h3>
      <p className="mt-1 text-sm font-semibold">
        <span className="text-white">Create. </span>
        <span className="text-primary">Schedule. </span>
        <span className="text-white">Grow.</span>
      </p>
    </div>
  );
}
