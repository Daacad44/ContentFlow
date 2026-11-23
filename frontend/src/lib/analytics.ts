import { api } from './api';

export interface DashboardMetrics {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  failedPosts: number;
  connectedAccounts: number;
  teamMembers: number;
  publishJobs: number;
  aiGenerations: number;
  publishRate: number;
  failureRate: number;
  periodDays: number;
}

export interface PlatformMetricsStatus {
  available: boolean;
  reason?: string;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface ReachAnalytics {
  publishedTargets: number;
  byPlatform: { platform: string; accountName: string | null; published: number; failed: number }[];
  totalReach: number | null;
  totalImpressions: number | null;
  platformMetrics: PlatformMetricsStatus;
}

export interface GrowthAnalytics {
  postsByStatus: { status: string; count: number }[];
  members: { total: number; new: number };
  accounts: { total: number; new: number };
  timeline: TimelinePoint[];
  growthRate: number | null;
}

function wsPath(workspaceId: string, path: string) {
  return `/workspaces/${workspaceId}/analytics${path}`;
}

export const analyticsApi = {
  dashboard: (workspaceId: string) =>
    api.get<{ data: { metrics: DashboardMetrics } }>(wsPath(workspaceId, '/dashboard')),

  engagement: (workspaceId: string, from?: string, to?: string) =>
    api.get<{ data: { engagement: Record<string, unknown> } }>(wsPath(workspaceId, '/engagement'), { params: { from, to } }),

  reach: (workspaceId: string, from?: string, to?: string) =>
    api.get<{ data: { reach: ReachAnalytics } }>(wsPath(workspaceId, '/reach'), { params: { from, to } }),

  growth: (workspaceId: string, from?: string, to?: string) =>
    api.get<{ data: { growth: GrowthAnalytics } }>(wsPath(workspaceId, '/growth'), { params: { from, to } }),

  performance: (workspaceId: string, from?: string, to?: string) =>
    api.get(wsPath(workspaceId, '/performance'), { params: { from, to } }),

  listReports: (workspaceId: string) =>
    api.get(wsPath(workspaceId, '/reports')),

  generateReport: (
    workspaceId: string,
    body: { title: string; type: string; periodStart: string; periodEnd: string },
  ) => api.post(wsPath(workspaceId, '/reports'), body),
};
