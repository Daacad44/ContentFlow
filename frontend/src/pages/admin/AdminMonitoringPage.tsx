import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';

export default function AdminMonitoringPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    adminApi.monitoring().then((r) => setData(r.data.data));
    const interval = setInterval(() => {
      adminApi.monitoring().then((r) => setData(r.data.data));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const system = data?.system as Record<string, unknown> | undefined;

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Monitoring</h1>
      <p className="mt-2 text-muted">Queue health, failures & system status</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Uptime" value={`${Math.round(Number(system?.uptime ?? 0) / 60)}m`} />
        <Stat label="Memory" value={`${system?.memoryMb ?? '—'} MB`} />
        <Stat label="Database" value={String(system?.database ?? '—')} />
      </div>

      <pre className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/40 p-4 text-xs text-muted overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-500/60 bg-ink-700/60 p-4">
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
