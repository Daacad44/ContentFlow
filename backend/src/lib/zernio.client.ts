/**
 * src/lib/zernio.client.ts
 * HTTP client for the Zernio unified social media API.
 */
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export interface ZernioProfile {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface ZernioAccount {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  profilePicture?: string;
  accountType?: string;
  status?: string;
  platformStatus?: string;
  isActive?: boolean;
  enabled?: boolean;
  profileId?: string;
  metadata?: Record<string, unknown>;
}

export interface ZernioAccountHealth {
  accountId: string;
  platform: string;
  username?: string;
  displayName?: string;
  status: 'healthy' | 'warning' | 'error' | string;
  tokenStatus?: {
    valid?: boolean;
    expiresAt?: string;
    expiresIn?: string;
    needsRefresh?: boolean;
  };
  issues?: string[];
  recommendations?: string[];
  permissions?: {
    canPost?: boolean;
    canFetchAnalytics?: boolean;
  };
}

interface ZernioRequestOptions {
  method?: string;
  body?: unknown;
  connectToken?: string;
}

class ZernioClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.ZERNIO_API_URL.replace(/\/$/, '');
    this.apiKey = env.ZERNIO_API_KEY;
  }

  private async request<T>(path: string, options: ZernioRequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (options.connectToken) {
      headers['X-Connect-Token'] = options.connectToken;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (typeof data.error === 'string' ? data.error : null) ??
        (typeof data.message === 'string' ? data.message : null) ??
        `Zernio API error (${res.status})`;
      throw ApiError.badRequest(message, data);
    }

    return data as T;
  }

  async createProfile(name: string, description?: string): Promise<ZernioProfile> {
    const data = await this.request<{ profile: ZernioProfile }>('/profiles', {
      method: 'POST',
      body: { name, description },
    });
    return data.profile;
  }

  async getProfile(profileId: string): Promise<ZernioProfile> {
    const data = await this.request<{ profile: ZernioProfile }>(`/profiles/${profileId}`);
    return data.profile;
  }

  async listProfiles(): Promise<ZernioProfile[]> {
    const data = await this.request<{ profiles: ZernioProfile[] }>('/profiles');
    return data.profiles ?? [];
  }

  async getConnectUrl(params: {
    platform: string;
    profileId: string;
    redirectUrl: string;
    headless?: boolean;
  }): Promise<{ authUrl: string; state?: string }> {
    const query = new URLSearchParams({
      profileId: params.profileId,
      redirect_url: params.redirectUrl,
    });
    if (params.headless) query.set('headless', 'true');

    const data = await this.request<{ authUrl: string; state?: string }>(
      `/connect/${params.platform}?${query.toString()}`,
    );
    return data;
  }

  async listAccounts(profileId?: string): Promise<ZernioAccount[]> {
    const query = profileId ? `?profileId=${profileId}` : '';
    const data = await this.request<{ accounts: ZernioAccount[] }>(`/accounts${query}`);
    return data.accounts ?? [];
  }

  async getAccount(accountId: string): Promise<ZernioAccount> {
    const data = await this.request<{ account: ZernioAccount }>(`/accounts/${accountId}`);
    return data.account;
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await this.request(`/accounts/${accountId}`, { method: 'DELETE' });
  }

  async checkAccountHealth(accountId: string): Promise<{
    healthy: boolean;
    status: string;
    needsReconnect: boolean;
    message?: string;
    raw: ZernioAccountHealth;
  }> {
    const data = await this.request<ZernioAccountHealth>(`/accounts/${accountId}/health`);
    const tokenValid = data.tokenStatus?.valid ?? data.status === 'healthy';
    const needsReconnect =
      data.status === 'error' ||
      data.tokenStatus?.needsRefresh === true ||
      (data.tokenStatus?.valid === false);
    const healthy = data.status === 'healthy' && tokenValid && !needsReconnect;
    const message =
      data.issues?.[0] ??
      data.recommendations?.[0] ??
      (healthy ? undefined : 'Token may be expired — reconnect the account.');

    return { healthy, status: data.status, needsReconnect, message, raw: data };
  }

  async getAllAccountsHealth(profileId?: string): Promise<ZernioAccountHealth[]> {
    const query = profileId ? `?profileId=${profileId}` : '';
    const data = await this.request<{ accounts: ZernioAccountHealth[] }>(
      `/accounts/health${query}`,
    );
    return data.accounts ?? [];
  }

  async listFacebookPages(params: {
    profileId: string;
    tempToken: string;
    connectToken?: string;
  }): Promise<Array<{ id: string; name: string; accessToken?: string }>> {
    const query = new URLSearchParams({
      profileId: params.profileId,
      tempToken: params.tempToken,
    });
    const data = await this.request<{ pages: Array<{ id: string; name: string }> }>(
      `/connect/facebook/select-page?${query.toString()}`,
      { connectToken: params.connectToken },
    );
    return data.pages ?? [];
  }

  async selectFacebookPage(params: {
    profileId: string;
    pageId: string;
    tempToken: string;
    userProfile: Record<string, unknown>;
    redirectUrl: string;
    connectToken?: string;
  }): Promise<{ redirect_url: string; account: { accountId: string; platform: string } }> {
    return this.request('/connect/facebook/select-page', {
      method: 'POST',
      connectToken: params.connectToken,
      body: {
        profileId: params.profileId,
        pageId: params.pageId,
        tempToken: params.tempToken,
        userProfile: params.userProfile,
        redirect_url: params.redirectUrl,
      },
    });
  }

  async listLinkedInOrgs(params: {
    profileId: string;
    tempToken: string;
    connectToken?: string;
  }): Promise<Array<{ id: string; name: string }>> {
    const query = new URLSearchParams({
      profileId: params.profileId,
      tempToken: params.tempToken,
    });
    const data = await this.request<{ organizations: Array<{ id: string; name: string }> }>(
      `/connect/linkedin/select-organization?${query.toString()}`,
      { connectToken: params.connectToken },
    );
    return data.organizations ?? [];
  }

  async selectLinkedInOrg(params: {
    profileId: string;
    organizationId: string;
    tempToken: string;
    userProfile: Record<string, unknown>;
    redirectUrl: string;
    connectToken?: string;
  }): Promise<{ redirect_url: string; account: { accountId: string; platform: string } }> {
    return this.request('/connect/linkedin/select-organization', {
      method: 'POST',
      connectToken: params.connectToken,
      body: {
        profileId: params.profileId,
        organizationId: params.organizationId,
        tempToken: params.tempToken,
        userProfile: params.userProfile,
        redirect_url: params.redirectUrl,
      },
    });
  }
}

export const zernioClient = new ZernioClient();
