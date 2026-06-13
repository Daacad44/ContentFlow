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
  createdAt?: string;
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

export interface ZernioPlatformPostResult {
  platform?: string;
  accountId?: string;
  status: string;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  errorMessage?: string;
}

export interface ZernioCreatePostResult {
  postId: string;
  status: string;
  platformStatus: string;
  platformPostId?: string;
  platformPostUrl?: string;
  errorMessage?: string;
  platform?: string;
}

interface ZernioRequestOptions {
  method?: string;
  body?: unknown;
  connectToken?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  parsePlatformResult(
    platforms: ZernioPlatformPostResult[] | undefined,
    accountId: string,
    platform: string,
  ): ZernioPlatformPostResult | undefined {
    if (!platforms?.length) return undefined;

    const byAccount = platforms.find(
      (p) => p.accountId === accountId || p.accountId === accountId.toString(),
    );
    if (byAccount) return byAccount;

    const byPlatform = platforms.find(
      (p) => p.platform?.toLowerCase() === platform.toLowerCase(),
    );
    if (byPlatform) return byPlatform;

    return platforms[0];
  }

  mapPostToCreateResult(
    post: {
      _id: string;
      status: string;
      platforms?: ZernioPlatformPostResult[];
    },
    accountId: string,
    platform: string,
  ): ZernioCreatePostResult {
    const platformResult = this.parsePlatformResult(post.platforms, accountId, platform);
    const errorMessage =
      platformResult?.error ?? platformResult?.errorMessage ?? undefined;

    return {
      postId: post._id,
      status: post.status,
      platformStatus: platformResult?.status ?? post.status,
      platformPostId: platformResult?.platformPostId,
      platformPostUrl: platformResult?.platformPostUrl,
      errorMessage,
      platform,
    };
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

  async listAccounts(profileId?: string, platform?: string): Promise<ZernioAccount[]> {
    const params = new URLSearchParams();
    if (profileId) params.set('profileId', profileId);
    if (platform) params.set('platform', platform);
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await this.request<{ accounts: ZernioAccount[] }>(`/accounts${query}`);
    return data.accounts ?? [];
  }

  async getAccount(accountId: string, profileId?: string): Promise<ZernioAccount> {
    const accounts = await this.listAccounts(profileId);
    const account = accounts.find((a) => a._id === accountId);
    if (!account) {
      throw ApiError.notFound(`Zernio account ${accountId} not found.`);
    }
    return account;
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
      data.tokenStatus?.valid === false;
    const canPost = data.permissions?.canPost !== false;
    const healthy = data.status === 'healthy' && tokenValid && !needsReconnect && canPost;
    const message =
      data.issues?.[0] ??
      data.recommendations?.[0] ??
      (!canPost ? 'Account lacks permission to publish.' : undefined) ??
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

  async createPost(params: {
    platform: string;
    accountId: string;
    content: string;
    mediaItems?: Array<{ type: 'image' | 'video'; url: string; title?: string }>;
    scheduledAt?: string;
    publishNow?: boolean;
  }): Promise<ZernioCreatePostResult> {
    const body: Record<string, unknown> = {
      content: params.content,
      platforms: [{ platform: params.platform, accountId: params.accountId }],
      publishNow: params.publishNow ?? !params.scheduledAt,
    };

    if (params.scheduledAt) {
      body.scheduledFor = params.scheduledAt;
      body.publishNow = false;
    }

    if (params.mediaItems?.length) {
      body.mediaItems = params.mediaItems;
    }

    const data = await this.request<{
      post: {
        _id: string;
        status: string;
        platforms?: ZernioPlatformPostResult[];
      };
      message?: string;
    }>('/posts', { method: 'POST', body });

    return this.mapPostToCreateResult(data.post, params.accountId, params.platform);
  }

  async getPost(postId: string) {
    const data = await this.request<{
      post: {
        _id: string;
        status: string;
        platforms?: ZernioPlatformPostResult[];
      };
    }>(`/posts/${postId}`);
    return data.post;
  }

  /**
   * Poll Zernio until the platform confirms delivery or reports failure.
   */
  async waitForPublishConfirmation(params: {
    zernioPostId: string;
    accountId: string;
    platform: string;
    maxAttempts?: number;
    intervalMs?: number;
  }): Promise<ZernioCreatePostResult> {
    const maxAttempts = params.maxAttempts ?? 12;
    const intervalMs = params.intervalMs ?? 5_000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const post = await this.getPost(params.zernioPostId);
      const result = this.mapPostToCreateResult(post, params.accountId, params.platform);

      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const status = (result.platformStatus || result.status || '').toLowerCase();
      if (status === 'failed' || status === 'error' || status === 'rejected') {
        throw new Error(
          result.errorMessage ??
            `Platform rejected the post (status: ${result.platformStatus || result.status}).`,
        );
      }

      const { isConfirmedPlatformPublish } = await import('../config/postPublishRules');
      if (isConfirmedPlatformPublish(result)) {
        return result;
      }

      if (attempt < maxAttempts) {
        await sleep(intervalMs);
      }
    }

    throw new Error(
      'Publish confirmation timed out — the platform did not confirm delivery within the expected window.',
    );
  }
}

export const zernioClient = new ZernioClient();
