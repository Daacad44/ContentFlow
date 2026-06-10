/**
 * src/lib/publish.ts
 * API client for publishing engine logs and job management.
 */
import { api } from './api';

export type PublishJobStatus =
  | 'QUEUED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'DELAYED'
  | 'CANCELLED';

export interface PublishLog {
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PublishJob {
  id: string;
  postId: string;
  workspaceId: string;
  bullJobId: string | null;
  status: PublishJobStatus;
  attempt: number;
  maxAttempts: number;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  post: { id: string; content: string; status: string; scheduledAt: string | null };
  logs: PublishLog[];
}

export const PUBLISH_STATUS_META: Record<
  PublishJobStatus,
  { label: string; color: string }
> = {
  QUEUED: { label: 'Queued', color: 'bg-slate-500/20 text-slate-300' },
  ACTIVE: { label: 'Active', color: 'bg-amber-500/20 text-amber-300' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-300' },
  FAILED: { label: 'Failed', color: 'bg-red-500/20 text-red-300' },
  DELAYED: { label: 'Delayed', color: 'bg-blue-500/20 text-blue-300' },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400' },
};

export const publishApi = {
  getStatus(workspaceId: string) {
    return api.get<{ data: { queueEnabled: boolean } }>(
      `/workspaces/${workspaceId}/publish/status`,
    );
  },

  listJobs(workspaceId: string, params?: { status?: PublishJobStatus; page?: number }) {
    return api.get<{
      data: {
        jobs: PublishJob[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    }>(`/workspaces/${workspaceId}/publish/jobs`, { params });
  },

  getJob(workspaceId: string, jobId: string) {
    return api.get<{ data: { job: PublishJob } }>(
      `/workspaces/${workspaceId}/publish/jobs/${jobId}`,
    );
  },

  getLogs(workspaceId: string, jobId: string) {
    return api.get<{ data: { logs: PublishLog[] } }>(
      `/workspaces/${workspaceId}/publish/jobs/${jobId}/logs`,
    );
  },

  retryJob(workspaceId: string, jobId: string) {
    return api.post<{ data: { job: PublishJob } }>(
      `/workspaces/${workspaceId}/publish/jobs/${jobId}/retry`,
    );
  },
};
