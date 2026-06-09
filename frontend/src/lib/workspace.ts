/**
 * src/lib/workspace.ts
 * Types and API helpers for workspace, team, and invitation features.
 */
import { api } from './api';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: WorkspaceRole;
  memberCount: number;
}

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
  };
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; fullName: string; email: string };
}

export interface InvitationPreview {
  email: string;
  role: WorkspaceRole;
  workspace: { id: string; name: string; slug: string; avatarUrl: string | null };
  invitedBy: string;
  expiresAt: string;
}

export const WORKSPACE_ROLES: { value: WorkspaceRole; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Admin', description: 'Manage members, settings, and content' },
  { value: 'MEMBER', label: 'Member', description: 'Create and manage content' },
  { value: 'VIEWER', label: 'Viewer', description: 'View-only access' },
];

export const workspaceApi = {
  list: () => api.get<{ data: { workspaces: Workspace[] } }>('/workspaces'),

  create: (input: { name: string; description?: string | null }) =>
    api.post<{ data: { workspace: Workspace } }>('/workspaces', input),

  get: (workspaceId: string) =>
    api.get<{ data: { workspace: Workspace } }>(`/workspaces/${workspaceId}`),

  update: (
    workspaceId: string,
    input: { name?: string; description?: string | null; avatarUrl?: string | null },
  ) => api.patch<{ data: { workspace: Workspace } }>(`/workspaces/${workspaceId}`, input),

  remove: (workspaceId: string) => api.delete(`/workspaces/${workspaceId}`),

  getPermissions: (workspaceId: string) =>
    api.get<{ data: { role: WorkspaceRole; permissions: string[] } }>(
      `/workspaces/${workspaceId}/permissions`,
    ),

  listMembers: (workspaceId: string) =>
    api.get<{ data: { members: WorkspaceMember[] } }>(`/workspaces/${workspaceId}/members`),

  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) =>
    api.patch<{ data: { member: WorkspaceMember } }>(
      `/workspaces/${workspaceId}/members/${memberId}/role`,
      { role },
    ),

  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${memberId}`),

  leave: (workspaceId: string) =>
    api.post(`/workspaces/${workspaceId}/members/leave`),

  transferOwnership: (workspaceId: string, memberId: string) =>
    api.post(`/workspaces/${workspaceId}/members/transfer-ownership`, { memberId }),

  listInvitations: (workspaceId: string) =>
    api.get<{ data: { invitations: WorkspaceInvitation[] } }>(
      `/workspaces/${workspaceId}/invitations`,
    ),

  invite: (workspaceId: string, input: { email: string; role?: WorkspaceRole }) =>
    api.post<{ data: { invitation: WorkspaceInvitation } }>(
      `/workspaces/${workspaceId}/invitations`,
      input,
    ),

  revokeInvitation: (workspaceId: string, invitationId: string) =>
    api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`),

  resendInvitation: (workspaceId: string, invitationId: string) =>
    api.post<{ data: { invitation: WorkspaceInvitation } }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
    ),

  previewInvitation: (token: string) =>
    api.get<{ data: { invitation: InvitationPreview } }>(`/invitations/${token}`),

  acceptInvitation: (token: string) =>
    api.post<{ data: { workspace: { id: string; name: string; slug: string } } }>(
      '/invitations/accept',
      { token },
    ),

  declineInvitation: (token: string) =>
    api.post('/invitations/decline', { token }),
};

export function roleBadgeColor(role: WorkspaceRole): string {
  switch (role) {
    case 'OWNER':
      return 'bg-brand/20 text-brand';
    case 'ADMIN':
      return 'bg-blue-500/20 text-blue-300';
    case 'MEMBER':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'VIEWER':
      return 'bg-slate-500/20 text-slate-300';
    default:
      return 'bg-ink-600 text-muted';
  }
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canEditSettings(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canDeleteWorkspace(role: WorkspaceRole): boolean {
  return role === 'OWNER';
}
