import { api } from './api';

export const adminApi = {
  dashboard: () => api.get<{ data: { stats: Record<string, unknown> } }>('/admin/dashboard'),

  revenue: (rangeDays = 30) =>
    api.get<{ data: Record<string, unknown> }>('/admin/revenue', { params: { rangeDays } }),

  monitoring: () => api.get<{ data: Record<string, unknown> }>('/admin/monitoring'),

  reports: () => api.get<{ data: Record<string, unknown> }>('/admin/reports'),

  listSettings: () => api.get<{ data: { settings: Array<{ key: string; value: unknown }> } }>('/admin/settings'),

  upsertSetting: (key: string, value: unknown) =>
    api.put(`/admin/settings/${key}`, { value }),
};
