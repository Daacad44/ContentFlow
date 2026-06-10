import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { activityLogsApi, type AuditLog, type LoginHistoryEntry } from '../lib/activityLogs';

export default function ActivityLogsPage() {
  const { activeWorkspace } = useWorkspace();
  const [tab, setTab] = useState<'audit' | 'login' | 'security'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [security, setSecurity] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    if (tab === 'audit') {
      activityLogsApi.listAudit(activeWorkspace.id).then((r) => setAuditLogs(r.data.data.items));
    } else if (tab === 'login') {
      activityLogsApi.listLoginHistory(activeWorkspace.id).then((r) => setLoginHistory(r.data.data.items));
    } else {
      activityLogsApi.getSecuritySummary(activeWorkspace.id).then((r) => setSecurity(r.data.data));
    }
  }, [activeWorkspace?.id, tab]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to view activity logs.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">Activity Logs</h1>
      <p className="mt-2 text-muted">Audit trail, login history & security events</p>

      <div className="mt-6 flex gap-2">
        {(['audit', 'login', 'security'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-ink-700'
            }`}
          >
            {t === 'audit' ? 'Audit Logs' : t === 'login' ? 'Login History' : 'Security'}
          </button>
        ))}
      </div>

      {tab === 'audit' && (
        <LogTable
          headers={['Action', 'Category', 'User', 'Time']}
          rows={auditLogs.map((l) => [
            l.action,
            l.category,
            l.user?.email ?? '—',
            new Date(l.createdAt).toLocaleString(),
          ])}
        />
      )}

      {tab === 'login' && (
        <LogTable
          headers={['Status', 'IP', 'User Agent', 'Time']}
          rows={loginHistory.map((l) => [
            l.success ? '✅ Success' : '❌ Failed',
            l.ipAddress ?? '—',
            l.userAgent?.slice(0, 40) ?? '—',
            new Date(l.createdAt).toLocaleString(),
          ])}
        />
      )}

      {tab === 'security' && security && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Failed Logins (24h)" value={String(security.failedLogins)} />
          <Stat label="Critical Events" value={String(security.criticalEvents)} />
          <Stat label="Security Events" value={String(security.totalSecurityEvents)} />
        </div>
      )}
    </AppShell>
  );
}

function LogTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-ink-500/60">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-ink-500 bg-ink-800">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ink-500/40 hover:bg-ink-700/40">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-white">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
