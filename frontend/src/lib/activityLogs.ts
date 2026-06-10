import { api } from './api';

export interface AuditLog {
  id: string;
  action: string;
  category: string;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; email: string; fullName: string };
  workspace?: { id: string; name: string; slug: string };
}

export interface LoginHistoryEntry {
  id: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  createdAt: string;
}

export const activityLogsApi = {
  listAudit: (workspaceId: string, params?: Record<string, string>) =>
    api.get<{ data: { items: AuditLog[]; total: number } }>(
      `/workspaces/${workspaceId}/activity-logs/audit`,
      { params },
    ),

  listLoginHistory: (workspaceId: string, params?: Record<string, string>) =>
    api.get<{ data: { items: LoginHistoryEntry[]; total: number } }>(
      `/workspaces/${workspaceId}/activity-logs/login-history`,
      { params },
    ),

  getSecuritySummary: (workspaceId: string) =>
    api.get<{ data: Record<string, number> }>(`/workspaces/${workspaceId}/activity-logs/security`),

  listSecurityLogs: (params?: Record<string, string>) =>
    api.get('/activity-logs/security', { params }),

  listSystemHistory: (params?: Record<string, string>) =>
    api.get('/activity-logs/system', { params }),
};
