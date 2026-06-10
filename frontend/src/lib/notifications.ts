import { api } from './api';

export type NotificationCategory =
  | 'POST' | 'PUBLISH' | 'TEAM' | 'BILLING' | 'SECURITY' | 'SYSTEM' | 'ALERT';

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: string;
  readAt: string | null;
  actionUrl: string | null;
  createdAt: string;
  workspace?: { id: string; name: string };
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    api.get<{ data: { items: Notification[]; unreadCount: number } }>('/notifications', {
      params: { unreadOnly },
    }),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.post('/notifications/read-all'),

  getPreferences: (workspaceId?: string) =>
    workspaceId
      ? api.get<{ data: { preferences: Array<{ category: NotificationCategory; emailEnabled: boolean; inAppEnabled: boolean }> } }>(
          `/workspaces/${workspaceId}/notifications/preferences`,
        )
      : api.get<{ data: { preferences: Array<{ category: NotificationCategory; emailEnabled: boolean; inAppEnabled: boolean }> } }>(
          '/notifications/preferences',
        ),

  updatePreferences: (
    preferences: Array<{ category: NotificationCategory; emailEnabled: boolean; inAppEnabled: boolean }>,
    workspaceId?: string,
  ) =>
    workspaceId
      ? api.patch(`/workspaces/${workspaceId}/notifications/preferences`, { preferences })
      : api.patch('/notifications/preferences', { preferences }),

  listAlerts: (workspaceId: string) =>
    api.get<{ data: { rules: Array<{ id: string; name: string; metric: string; condition: string; threshold: number; isActive: boolean }> } }>(
      `/workspaces/${workspaceId}/notifications/alerts`,
    ),

  createAlert: (
    workspaceId: string,
    data: { name: string; metric: string; condition: string; threshold: number },
  ) => api.post(`/workspaces/${workspaceId}/notifications/alerts`, data),

  deleteAlert: (workspaceId: string, ruleId: string) =>
    api.delete(`/workspaces/${workspaceId}/notifications/alerts/${ruleId}`),
};
