/**
 * Per-screen brand-panel illustrations. Stylized dark vector art matching the
 * approved design (analytics, profile, security, mail, etc.).
 */

const FRAME = 'w-full max-w-[240px]';

export function LoginIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <rect x="14" y="22" width="180" height="126" rx="14" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <path d="M34 120 L70 92 L98 108 L132 70 L168 86" stroke="#FF8A00" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="92" r="4" fill="#FF8A00" />
      <circle cx="132" cy="70" r="4" fill="#FF8A00" />
      <rect x="34" y="40" width="70" height="8" rx="4" fill="#1e293b" />
      <rect x="34" y="54" width="44" height="6" rx="3" fill="#16223b" />
      {/* calendar */}
      <rect x="176" y="96" width="64" height="56" rx="12" fill="#FF8A00" />
      <rect x="176" y="96" width="64" height="18" rx="12" fill="#e07700" />
      <text x="208" y="142" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0b1220">25</text>
      <circle cx="190" cy="105" r="2.4" fill="#0b1220" />
      <circle cx="226" cy="105" r="2.4" fill="#0b1220" />
    </svg>
  );
}

export function RegisterIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <circle cx="100" cy="78" r="46" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <circle cx="100" cy="64" r="16" fill="#FF8A00" />
      <path d="M70 104a30 30 0 0 1 60 0Z" fill="#1e293b" />
      <circle cx="158" cy="96" r="22" fill="#2563eb" />
      <path d="M158 87v18M149 96h18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect x="40" y="134" width="40" height="8" rx="4" fill="#16223b" />
      <rect x="92" y="134" width="64" height="8" rx="4" fill="#16223b" />
    </svg>
  );
}

export function ForgotIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <path d="M100 26l44 16v34c0 28-20 44-44 52-24-8-44-24-44-52V42z" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <rect x="84" y="74" width="32" height="26" rx="6" fill="#FF8A00" />
      <path d="M89 74v-7a11 11 0 0 1 22 0v7" stroke="#FF8A00" strokeWidth="3.5" fill="none" />
      <circle cx="100" cy="86" r="3.4" fill="#0b1220" />
      {/* envelope */}
      <rect x="150" y="92" width="66" height="48" rx="10" fill="#FF8A00" />
      <path d="M150 100l33 22 33-22" stroke="#0b1220" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function ResetIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <circle cx="120" cy="82" r="52" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <circle cx="120" cy="68" r="18" fill="#FF8A00" />
      <path d="M86 110a34 34 0 0 1 68 0Z" fill="#1e293b" />
      <circle cx="158" cy="116" r="18" fill="#22C55E" />
      <path d="M150 116l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function VerifyIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <rect x="56" y="44" width="148" height="96" rx="14" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <path d="M56 58l74 50 74-50" stroke="#FF8A00" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="186" cy="52" r="18" fill="#22C55E" />
      <path d="M178 52l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ProfileIllustration() {
  return (
    <svg viewBox="0 0 260 170" fill="none" className={FRAME} aria-hidden>
      <rect x="40" y="40" width="180" height="96" rx="14" fill="#0b1426" stroke="rgba(255,255,255,0.08)" />
      <circle cx="84" cy="80" r="20" fill="#1e293b" />
      <circle cx="84" cy="73" r="8" fill="#94a3b8" />
      <path d="M70 94a14 14 0 0 1 28 0Z" fill="#94a3b8" />
      <rect x="118" y="66" width="74" height="9" rx="4.5" fill="#16223b" />
      <rect x="118" y="84" width="56" height="9" rx="4.5" fill="#16223b" />
      <circle cx="196" cy="116" r="18" fill="#2563eb" />
      <path d="M188 116l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
