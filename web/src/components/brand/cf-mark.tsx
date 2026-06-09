import { cn } from '@/lib/utils';

/**
 * The finalized ContentFlow "CF" monogram — orange outlined C + F.
 * Size-locked via the `size` prop; do not recolor or restyle.
 */
export function CfMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* C */}
      <path
        d="M27 13.5a11 11 0 1 0 0 21"
        stroke="#FF8A00"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* F */}
      <path
        d="M25 15.5h11M25 24h8M25 15.5V34"
        stroke="#FF8A00"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
