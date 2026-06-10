import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    adminApi.dashboard().then((r) => setStats(r.data.data.stats));
  }, []);

  const users = stats?.users as Record<string, number> | undefined;
  const revenue = stats?.revenue as Record<string, number> | undefined;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
      <p className="mt-2 text-muted">Platform overview & key metrics</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total Users" value={String(users?.total ?? '—')} />
        <Card label="Active Users" value={String(users?.active ?? '—')} />
        <Card label="Recent Signups" value={String(users?.recentSignups ?? '—')} />
        <Card label="Revenue (30d)" value={`$${((revenue?.last30DaysCents ?? 0) / 100).toFixed(2)}`} />
      </div>

      <pre className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/40 p-4 text-xs text-muted">
        {JSON.stringify(stats, null, 2)}
      </pre>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
