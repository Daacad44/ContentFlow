/**
 * src/pages/PublishingLogsPage.tsx
 * Publishing engine job logs, status, and retry failed jobs.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../components/AppShell';
import { useWorkspace } from '../context/WorkspaceContext';
import { getApiErrorMessage } from '../lib/api';
import { publishApi, PublishJob, PUBLISH_STATUS_META } from '../lib/publish';

export default function PublishingLogsPage() {
  const { activeWorkspace, permissions } = useWorkspace();
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [queueEnabled, setQueueEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const canRead = permissions.includes('publish:logs_read');
  const canRetry = permissions.includes('publish:retry');

  const load = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const [statusRes, jobsRes] = await Promise.all([
        publishApi.getStatus(activeWorkspace.id),
        publishApi.listJobs(activeWorkspace.id),
      ]);
      setQueueEnabled(statusRes.data.data.queueEnabled);
      setJobs(jobsRes.data.data.jobs);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load publishing logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeWorkspace]);

  const handleRetry = async (jobId: string) => {
    if (!activeWorkspace) return;
    try {
      await publishApi.retryJob(activeWorkspace.id, jobId);
      toast.success('Retry queued');
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Retry failed.'));
    }
  };

  if (!activeWorkspace) {
    return (
      <AppShell>
        <p className="text-muted">Select a workspace to view publishing logs.</p>
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell>
        <p className="text-muted">You do not have permission to view publishing logs.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Publishing Logs</h1>
            <p className="mt-1 text-sm text-muted">
              Monitor auto-publishing jobs, view logs, and retry failed posts.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              queueEnabled
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {queueEnabled ? 'BullMQ + Redis active' : 'In-process scheduler (fallback)'}
          </span>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-muted">No publish jobs yet. Schedule or publish a post to see logs here.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const meta = PUBLISH_STATUS_META[job.status];
              const expanded = expandedJob === job.id;
              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-ink-500/60 bg-ink-800/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted">
                          Attempt {job.attempt}/{job.maxAttempts}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm text-slate-300">
                        {job.post.content.slice(0, 120)}
                        {job.post.content.length > 120 ? '…' : ''}
                      </p>
                      {job.errorMessage && (
                        <p className="mt-1 text-xs text-red-400">{job.errorMessage}</p>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        Created {new Date(job.createdAt).toLocaleString()}
                        {job.scheduledFor && ` · Scheduled ${new Date(job.scheduledFor).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedJob(expanded ? null : job.id)}
                        className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-slate-200 hover:bg-ink-700"
                      >
                        {expanded ? 'Hide logs' : 'View logs'}
                      </button>
                      {canRetry && job.status === 'FAILED' && (
                        <button
                          onClick={() => void handleRetry(job.id)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>

                  {expanded && job.logs.length > 0 && (
                    <div className="mt-4 space-y-1 border-t border-ink-500/40 pt-3">
                      {job.logs.map((log) => (
                        <div key={log.id} className="flex gap-2 text-xs">
                          <span
                            className={
                              log.level === 'error'
                                ? 'text-red-400'
                                : log.level === 'warn'
                                  ? 'text-amber-400'
                                  : 'text-muted'
                            }
                          >
                            [{log.level}]
                          </span>
                          <span className="text-slate-300">{log.message}</span>
                          <span className="ml-auto text-muted">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
