import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';

export default function AdminRevenuePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    adminApi.revenue(30).then((r) => setData(r.data.data));
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Revenue Dashboard</h1>
      <p className="mt-2 text-muted">Payments, invoices & subscription breakdown</p>
      <pre className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/40 p-4 text-xs text-muted overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AppShell>
  );
}
