import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';

export default function AdminReportsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    adminApi.reports().then((r) => setData(r.data.data));
  }, []);

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Platform Reports</h1>
      <p className="mt-2 text-muted">User growth, post activity & audit summary</p>
      <pre className="mt-8 rounded-xl border border-ink-500/60 bg-ink-700/40 p-4 text-xs text-muted overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </AppShell>
  );
}
