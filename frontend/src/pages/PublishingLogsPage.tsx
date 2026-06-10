/**
 * src/pages/PublishingLogsPage.tsx — Module 05 Publishing Engine
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { publishApi, PublishJob, PublishJobStatus } from '../lib/publish';
import { PageHeader, StatCard, StatusBadge, TabBar } from '../components/ui/ContentFlowUI';

const JOB_TABS = [
  { key: 'ALL', label: 'All Jobs' },
  { key: 'QUEUED', label: 'In Queue' },
  { key: 'ACTIVE', label: 'Pending' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
];

function jobStatusVariant(status: PublishJobStatus): 'pending' | 'info' | 'active' | 'failed' {
  if (status === 'QUEUED' || status === 'DELAYED') return 'pending';
  if (status === 'ACTIVE') return 'info';
  if (status === 'COMPLETED') return 'active';
  return 'failed';
}

function jobStatusLabel(status: PublishJobStatus): string {
  const labels: Record<PublishJobStatus, string> = {
    QUEUED: 'In Queue',
    ACTIVE: 'Publishing',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    DELAYED: 'In Queue',
    CANCELLED: 'Cancelled',
  };
  return labels[status];
}

export default function PublishingLogsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  const canRead = permissions.includes('publish:logs_read');
  const canRetry = permissions.includes('publish:retry');

  const load = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data } = await publishApi.listJobs(activeWorkspace.id);
      setJobs(data.data.jobs);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load publishing logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const counts = useMemo(() => ({
    queued: jobs.filter((j) => j.status === 'QUEUED' || j.status === 'DELAYED').length,
    pending: jobs.filter((j) => j.status === 'ACTIVE').length,
    completed: jobs.filter((j) => j.status === 'COMPLETED').length,
    failed: jobs.filter((j) => j.status === 'FAILED').length,
  }), [jobs]);

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return jobs;
    if (activeTab === 'QUEUED') return jobs.filter((j) => j.status === 'QUEUED' || j.status === 'DELAYED');
    return jobs.filter((j) => j.status === activeTab);
  }, [jobs, activeTab]);

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-cf-muted">Select a workspace to view publishing logs.</p>
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell>
        <p className="text-cf-muted">You do not have permission to view publishing logs.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Queue Overview" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="In Queue" value={String(counts.queued)} />
        <StatCard label="Pending" value={String(counts.pending)} />
        <StatCard label="Completed" value={String(counts.completed)} />
        <StatCard label="Failed" value={String(counts.failed)} />
      </div>

      <TabBar tabs={JOB_TABS} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <p className="text-cf-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-cf-muted">No publish jobs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cf-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cf-border bg-cf-navy-900">
              <tr>
                {['Post', 'Platform', 'Schedule Time', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-cf-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id} className="border-b border-cf-border/60 hover:bg-cf-navy-900/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-cf-text">{job.post.content.slice(0, 50)}</p>
                    <p className="text-xs text-cf-muted">{job.post.content.slice(0, 80)}</p>
                  </td>
                  <td className="px-4 py-3 text-cf-muted">—</td>
                  <td className="px-4 py-3 text-cf-muted">
                    {job.scheduledFor
                      ? new Date(job.scheduledFor).toLocaleString()
                      : new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={jobStatusVariant(job.status)}>
                      {jobStatusLabel(job.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {canRetry && job.status === 'FAILED' && (
                      <button
                        onClick={async () => {
                          await publishApi.retryJob(activeWorkspace.id, job.id);
                          toast.success('Retry queued');
                          void load();
                        }}
                        className="text-xs text-brand hover:underline"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
