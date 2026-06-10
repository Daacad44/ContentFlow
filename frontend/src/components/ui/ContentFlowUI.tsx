import { ReactNode } from 'react';

export type BadgeVariant = 'active' | 'pending' | 'failed' | 'info' | 'connected' | 'paid';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  connected: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
  info: 'bg-blue-500/15 text-blue-400',
  paid: 'bg-emerald-500/15 text-emerald-400',
};

export function StatusBadge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[variant]}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="cf-page-title">{title}</h1>
        {subtitle && <p className="cf-page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  positive,
  sparkline,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  sparkline?: number[];
}) {
  return (
    <div className="cf-card p-5">
      <p className="text-xs font-medium text-cf-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-cf-text">{value}</p>
          {change && (
            <p className={`mt-1 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {change}
            </p>
          )}
        </div>
        {sparkline && <Sparkline data={sparkline} />}
      </div>
    </div>
  );
}

export function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke="#D97706"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function LineChart({
  title,
  series,
  labels,
}: {
  title: string;
  series: { name: string; color: string; data: number[] }[];
  labels: string[];
}) {
  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(...allValues, 1);
  const w = 600;
  const h = 200;
  const pad = 24;

  const toPoints = (data: number[]) =>
    data
      .map((v, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (w - pad * 2);
        const y = pad + (1 - v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div className="cf-card">
      <h3 className="text-sm font-semibold text-cf-text">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = pad + pct * (h - pad * 2);
            return (
              <line key={pct} x1={pad} y1={y} x2={w - pad} y2={y} stroke="#334155" strokeWidth="1" />
            );
          })}
          {series.map((s) => (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={toPoints(s.data)}
            />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-xs text-cf-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </div>
        ))}
        <div className="ml-auto flex gap-2 text-xs text-cf-muted">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  emptyMessage = 'No data available.',
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-cf-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-cf-border bg-cf-navy-900">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-medium text-cf-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-cf-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-cf-border/60 hover:bg-cf-navy-900/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-cf-text">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-cf-navy-800 font-medium text-cf-text ${dim}`}
    >
      {initials}
    </span>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1E293B" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#D97706"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="54" textAnchor="middle" fill="#F8FAFC" fontSize="16" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <p className="mt-2 text-center text-sm text-cf-muted">{label}</p>
    </div>
  );
}

export function SubNav({
  items,
  active,
  onChange,
}: {
  items: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="flex w-48 shrink-0 flex-col gap-1 border-r border-cf-border pr-4">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
            active === item.key
              ? 'bg-brand text-white'
              : 'text-cf-muted hover:bg-cf-navy-800 hover:text-cf-text'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 border-b border-cf-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            active === tab.key
              ? 'border-brand text-brand'
              : 'border-transparent text-cf-muted hover:text-cf-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-cf-text">{label}</span>
        <span className="text-cf-muted">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cf-navy-800">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
