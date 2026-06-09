/**
 * src/lib/social.ts
 * API client for social account management.
 */
import { api } from './api';

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'LINKEDIN' | 'TIKTOK';

export type SocialAccountStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'TOKEN_EXPIRED'
  | 'ERROR'
  | 'PENDING';

export interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  zernioAccountId: string;
  externalAccountId: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  status: SocialAccountStatus;
  connectedAt: string;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; icon: string }
> = {
  FACEBOOK: { label: 'Facebook', color: '#1877F2', icon: 'f' },
  INSTAGRAM: { label: 'Instagram', color: '#E4405F', icon: 'ig' },
  LINKEDIN: { label: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  TIKTOK: { label: 'TikTok', color: '#FE2C55', icon: 'tt' },
};

export const socialApi = {
  list(workspaceId: string) {
    return api.get<{ data: { accounts: ConnectedAccount[] } }>(
      `/workspaces/${workspaceId}/social`,
    );
  },

  connect(workspaceId: string, platform: SocialPlatform, redirectPath?: string) {
    return api.post<{ data: { authUrl: string; state: string } }>(
      `/workspaces/${workspaceId}/social/connect`,
      { platform, redirectPath },
    );
  },

  sync(workspaceId: string) {
    return api.post<{
      data: { synced: number; accounts: ConnectedAccount[] };
    }>(`/workspaces/${workspaceId}/social/sync`);
  },

  disconnect(workspaceId: string, accountId: string) {
    return api.delete(`/workspaces/${workspaceId}/social/${accountId}`);
  },

  checkHealth(workspaceId: string, accountId: string) {
    return api.get<{ data: { health: { healthy: boolean; message?: string } } }>(
      `/workspaces/${workspaceId}/social/${accountId}/health`,
    );
  },

  listSelection(
    workspaceId: string,
    body: {
      platform: SocialPlatform;
      profileId: string;
      tempToken: string;
      connectToken?: string;
    },
  ) {
    return api.post<{
      data: {
        type: 'pages' | 'organizations';
        items: Array<{ id: string; name: string }>;
      };
    }>(`/workspaces/${workspaceId}/social/selection/list`, body);
  },

  completeSelection(
    workspaceId: string,
    body: {
      platform: SocialPlatform;
      profileId: string;
      itemId: string;
      tempToken: string;
      connectToken?: string;
      userProfile: Record<string, unknown>;
    },
  ) {
    return api.post<{ data: { account: ConnectedAccount | null } }>(
      `/workspaces/${workspaceId}/social/selection/complete`,
      body,
    );
  },
};
