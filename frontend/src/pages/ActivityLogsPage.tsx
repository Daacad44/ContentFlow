/** src/pages/ActivityLogsPage.tsx — Module 12 Activity Logs */
import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { activityLogsApi, type AuditLog } from '../lib/activityLogs';
import { PageHeader, Avatar, DataTable } from '../components/ui/ContentFlowUI';

export default function ActivityLogsPage() {
  const { activeWorkspace } = useWorkspace();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activityFilter, setActivityFilter] = useState('all');

  useEffect(() => {
    if (!activeWorkspace) return;
    activityLogsApi
      .listAudit(activeWorkspace.id, activityFilter !== 'all' ? { category: activityFilter } : undefined)
      .then((r) => setAuditLogs(r.data.data.items));
  }, [activeWorkspace?.id, activityFilter]);

  const rows = auditLogs.map((l) => [
    <div key={l.id} className="flex items-center gap-3">
      <Avatar name={l.user?.fullName ?? 'System'} size="sm" />
      <span>{l.user?.fullName ?? 'System'}</span>
    </div>,
    l.action,
    (l.metadata?.title as string) ?? (l.metadata?.name as string) ?? l.category,
    new Date(l.createdAt).toLocaleString(),
  ]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to view activity logs.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Activity Logs"
        action={
          <div className="flex gap-2">
            <select
              className="cf-input w-40 text-xs"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="all">All activity</option>
              <option value="POST">Posts</option>
              <option value="TEAM">Team</option>
              <option value="BILLING">Billing</option>
            </select>
            <input type="date" className="cf-input w-36 text-xs" />
          </div>
        }
      />

      <DataTable
        headers={['User', 'Action', 'Details', 'Time']}
        rows={rows}
        emptyMessage="No activity logs yet."
      />
    </AppShell>
  );
}
