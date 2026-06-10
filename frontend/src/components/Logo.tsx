/** src/components/Logo.tsx — ContentFlow wordmark + mark. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 44 : size === 'sm' ? 28 : 34;
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className="flex items-center gap-2.5">
      <svg width={dim} height={dim} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect width="48" height="48" rx="12" fill="url(#cfg)" />
        <path
          d="M31 17.5c-1.6-1.5-3.8-2.5-6.3-2.5-5 0-9 4-9 9s4 9 9 9c2.5 0 4.7-1 6.3-2.6"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient id="cfg" x1="0" y1="0" x2="48" y2="48">
            <stop stopColor="#D97706" />
            <stop offset="1" stopColor="#B45309" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`font-bold tracking-tight text-cf-text ${text}`}>ContentFlow</span>
    </div>
  );
}
