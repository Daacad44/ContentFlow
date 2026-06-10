import { api } from './api';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  interval: string;
  priceCents: number;
  currency: string;
  features: Record<string, number>;
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

export const billingApi = {
  listPlans: () => api.get<{ data: { plans: Plan[] } }>('/billing/plans'),

  getSubscription: (workspaceId: string) =>
    api.get<{ data: { subscription: Subscription } }>(`/workspaces/${workspaceId}/billing/subscription`),

  getUsage: (workspaceId: string) =>
    api.get<{ data: Record<string, unknown> }>(`/workspaces/${workspaceId}/billing/usage`),

  listInvoices: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/billing/invoices`),

  listPayments: (workspaceId: string) =>
    api.get(`/workspaces/${workspaceId}/billing/payments`),

  checkout: (workspaceId: string, planSlug: string) =>
    api.post<{ data: { url: string } }>(`/workspaces/${workspaceId}/billing/checkout`, { planSlug }),

  portal: (workspaceId: string) =>
    api.post<{ data: { url: string } }>(`/workspaces/${workspaceId}/billing/portal`),

  cancel: (workspaceId: string) =>
    api.post(`/workspaces/${workspaceId}/billing/cancel`),
};
