/**
 * src/services/socialAccount.service.ts
 * Connect, sync, and manage social accounts via Zernio API.
 */
import { Prisma, SocialAccountStatus, SocialPlatform } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { zernioClient, ZernioAccount } from '../lib/zernio.client';
import { fromZernioPlatform, toZernioPlatform } from '../config/socialPlatforms';
import { socialProfileService } from './socialProfile.service';
import { socialTokenService } from './socialToken.service';
import { auditService, AUDIT } from './audit.service';
import { ApiError } from '../utils/apiError';

interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

function mapAccountStatus(
  zernioStatus?: string,
  platformStatus?: string,
  isActive?: boolean,
): SocialAccountStatus {
  const status = (zernioStatus ?? platformStatus ?? '').toLowerCase();
  if (!status && isActive !== false) return SocialAccountStatus.CONNECTED;
  if (status === 'healthy' || status === 'active' || status === 'connected') {
    return SocialAccountStatus.CONNECTED;
  }
  if (status === 'warning') return SocialAccountStatus.CONNECTED;
  if (status === 'error' || status === 'invalid') return SocialAccountStatus.ERROR;
  if (status.includes('disconnect') || status === 'disconnected' || status === 'inactive') {
    return SocialAccountStatus.DISCONNECTED;
  }
  if (status.includes('expired')) return SocialAccountStatus.TOKEN_EXPIRED;
  return SocialAccountStatus.CONNECTED;
}

function mapHealthToStatus(health: {
  status: string;
  needsReconnect: boolean;
  healthy: boolean;
}): SocialAccountStatus {
  if (health.healthy) return SocialAccountStatus.CONNECTED;
  if (health.needsReconnect || health.status === 'error') {
    return SocialAccountStatus.TOKEN_EXPIRED;
  }
  if (health.status === 'warning') return SocialAccountStatus.CONNECTED;
  return SocialAccountStatus.ERROR;
}

function toConnectedAccountDto(account: {
  id: string;
  platform: SocialPlatform;
  zernioAccountId: string;
  externalAccountId: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  status: SocialAccountStatus;
  connectedAt: Date;
  lastSyncedAt: Date | null;
  metadata: Prisma.JsonValue;
}) {
  return {
    id: account.id,
    platform: account.platform,
    zernioAccountId: account.zernioAccountId,
    externalAccountId: account.externalAccountId,
    displayName: account.displayName,
    username: account.username,
    avatarUrl: account.avatarUrl,
    accountType: account.accountType,
    status: account.status,
    connectedAt: account.connectedAt,
    lastSyncedAt: account.lastSyncedAt,
    metadata: account.metadata,
  };
}

async function upsertFromZernio(
  workspaceId: string,
  socialProfileId: string,
  zernioAccount: ZernioAccount,
  connectedByUserId?: string,
) {
  const platform = fromZernioPlatform(zernioAccount.platform);
  if (!platform) return null;

  const status = mapAccountStatus(
    zernioAccount.status,
    zernioAccount.platformStatus,
    zernioAccount.isActive ?? zernioAccount.enabled,
  );

  return prisma.connectedAccount.upsert({
    where: {
      workspaceId_zernioAccountId: {
        workspaceId,
        zernioAccountId: zernioAccount._id,
      },
    },
    create: {
      workspaceId,
      socialProfileId,
      platform,
      zernioAccountId: zernioAccount._id,
      externalAccountId: zernioAccount._id,
      displayName: zernioAccount.displayName ?? null,
      username: zernioAccount.username ?? null,
      avatarUrl: zernioAccount.profilePictureUrl ?? zernioAccount.profilePicture ?? null,
      accountType: zernioAccount.accountType ?? null,
      status,
      metadata: (zernioAccount.metadata as Prisma.InputJsonValue) ?? undefined,
      connectedByUserId: connectedByUserId ?? null,
      lastSyncedAt: new Date(),
    },
    update: {
      displayName: zernioAccount.displayName ?? null,
      username: zernioAccount.username ?? null,
      avatarUrl: zernioAccount.profilePictureUrl ?? zernioAccount.profilePicture ?? null,
      accountType: zernioAccount.accountType ?? null,
      status,
      metadata: (zernioAccount.metadata as Prisma.InputJsonValue) ?? undefined,
      lastSyncedAt: new Date(),
      disconnectedAt: status === SocialAccountStatus.DISCONNECTED ? new Date() : null,
    },
  });
}

export const socialAccountService = {
  async list(workspaceId: string) {
    const accounts = await prisma.connectedAccount.findMany({
      where: { workspaceId, status: { not: SocialAccountStatus.DISCONNECTED } },
      orderBy: [{ platform: 'asc' }, { connectedAt: 'desc' }],
    });
    return accounts.map(toConnectedAccountDto);
  },

  async startConnect(params: {
    workspaceId: string;
    workspaceName: string;
    platform: SocialPlatform;
    userId: string;
    redirectPath?: string;
    ctx?: ClientContext;
  }) {
    socialProfileService.assertZernioEnabled();

    const profile = await socialProfileService.ensureForWorkspace(
      params.workspaceId,
      params.workspaceName,
    );

    const state = await socialTokenService.createOAuthState({
      socialProfileId: profile.id,
      platform: params.platform,
      userId: params.userId,
      redirectPath: params.redirectPath,
    });

    const callbackUrl = `${env.API_URL}/api/v1/social/oauth/callback?cf_state=${state}`;
    const { authUrl } = await zernioClient.getConnectUrl({
      platform: toZernioPlatform(params.platform),
      profileId: profile.zernioProfileId,
      redirectUrl: callbackUrl,
    });

    await auditService.record({
      action: AUDIT.SOCIAL_CONNECT_STARTED,
      userId: params.userId,
      ipAddress: params.ctx?.ipAddress,
      userAgent: params.ctx?.userAgent,
      metadata: { workspaceId: params.workspaceId, platform: params.platform },
    });

    return { authUrl, state };
  },

  async handleOAuthCallback(query: Record<string, string | undefined>, ctx?: ClientContext) {
    socialProfileService.assertZernioEnabled();

    const cfState = query.cf_state;
    if (!cfState) throw ApiError.badRequest('Missing OAuth state.');

    const oauthState = await socialTokenService.consumeOAuthState(cfState);
    const profile = await prisma.socialProfile.findUnique({
      where: { id: oauthState.socialProfileId },
      include: { workspace: { select: { id: true, name: true } } },
    });
    if (!profile) throw ApiError.notFound('Social profile not found.');

    const workspaceId = profile.workspaceId;
    const redirectPath = oauthState.redirectPath ?? '/accounts';

    // Headless flow — platform requires secondary selection (Facebook pages, LinkedIn orgs)
    if (query.step === 'select_page' || query.step === 'select_organization') {
      return {
        type: 'selection' as const,
        workspaceId,
        platform: oauthState.platform,
        profileId: profile.zernioProfileId,
        tempToken: query.tempToken ?? '',
        connectToken: query.connect_token ?? '',
        userProfile: query.userProfile ? decodeURIComponent(query.userProfile) : '{}',
        step: query.step,
        redirectPath,
      };
    }

    // Standard flow — account connected directly
    const accountId = query.accountId;
    const connected = query.connected;

    if (accountId) {
      const zernioAccount = await zernioClient.getAccount(accountId, profile.zernioProfileId);
      const account = await upsertFromZernio(
        workspaceId,
        profile.id,
        zernioAccount,
        oauthState.userId,
      );

      await auditService.record({
        action: AUDIT.SOCIAL_ACCOUNT_CONNECTED,
        userId: oauthState.userId,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
        metadata: {
          workspaceId,
          platform: connected ?? oauthState.platform,
          accountId,
        },
      });

      return {
        type: 'success' as const,
        workspaceId,
        account: account ? toConnectedAccountDto(account) : null,
        redirectPath,
      };
    }

    // Fallback — sync accounts for the profile (e.g. TikTok omits accountId in redirect)
    if (connected) {
      const platform = fromZernioPlatform(connected);
      if (platform) {
        const zernioAccounts = await zernioClient.listAccounts(
          profile.zernioProfileId,
          connected,
        );
        const latest = zernioAccounts
          .filter((a) => fromZernioPlatform(a.platform) === platform)
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];

        if (latest) {
          const account = await upsertFromZernio(
            workspaceId,
            profile.id,
            latest,
            oauthState.userId,
          );
          await auditService.record({
            action: AUDIT.SOCIAL_ACCOUNT_CONNECTED,
            userId: oauthState.userId,
            ipAddress: ctx?.ipAddress,
            userAgent: ctx?.userAgent,
            metadata: { workspaceId, platform: connected, accountId: latest._id },
          });
          return {
            type: 'success' as const,
            workspaceId,
            account: account ? toConnectedAccountDto(account) : null,
            redirectPath,
          };
        }
      }
    }

    await this.syncAccounts(workspaceId, oauthState.userId, ctx);
    return { type: 'success' as const, workspaceId, account: null, redirectPath };
  },

  async listSelectionOptions(params: {
    workspaceId: string;
    platform: SocialPlatform;
    profileId: string;
    tempToken: string;
    connectToken?: string;
  }) {
    socialProfileService.assertZernioEnabled();

    if (params.platform === SocialPlatform.FACEBOOK) {
      const pages = await zernioClient.listFacebookPages({
        profileId: params.profileId,
        tempToken: params.tempToken,
        connectToken: params.connectToken,
      });
      return { type: 'pages' as const, items: pages };
    }

    if (params.platform === SocialPlatform.LINKEDIN) {
      const orgs = await zernioClient.listLinkedInOrgs({
        profileId: params.profileId,
        tempToken: params.tempToken,
        connectToken: params.connectToken,
      });
      return { type: 'organizations' as const, items: orgs };
    }

    throw ApiError.badRequest('This platform does not require selection.');
  },

  async completeSelection(params: {
    workspaceId: string;
    platform: SocialPlatform;
    profileId: string;
    itemId: string;
    tempToken: string;
    userProfile: Record<string, unknown>;
    connectToken?: string;
    userId: string;
    ctx?: ClientContext;
  }) {
    socialProfileService.assertZernioEnabled();

    const profile = await socialProfileService.getByWorkspaceId(params.workspaceId);
    if (!profile) throw ApiError.notFound('Social profile not found.');

    const finalRedirect = `${env.CLIENT_URL}/social/callback?workspaceId=${params.workspaceId}`;

    let result: { redirect_url: string; account: { accountId: string; platform: string } };

    if (params.platform === SocialPlatform.FACEBOOK) {
      result = await zernioClient.selectFacebookPage({
        profileId: params.profileId,
        pageId: params.itemId,
        tempToken: params.tempToken,
        userProfile: params.userProfile,
        redirectUrl: finalRedirect,
        connectToken: params.connectToken,
      });
    } else if (params.platform === SocialPlatform.LINKEDIN) {
      result = await zernioClient.selectLinkedInOrg({
        profileId: params.profileId,
        organizationId: params.itemId,
        tempToken: params.tempToken,
        userProfile: params.userProfile,
        redirectUrl: finalRedirect,
        connectToken: params.connectToken,
      });
    } else {
      throw ApiError.badRequest('Selection not supported for this platform.');
    }

    const zernioAccount = await zernioClient.getAccount(
      result.account.accountId,
      profile.zernioProfileId,
    );
    const account = await upsertFromZernio(
      params.workspaceId,
      profile.id,
      zernioAccount,
      params.userId,
    );

    await auditService.record({
      action: AUDIT.SOCIAL_ACCOUNT_CONNECTED,
      userId: params.userId,
      ipAddress: params.ctx?.ipAddress,
      userAgent: params.ctx?.userAgent,
      metadata: {
        workspaceId: params.workspaceId,
        platform: params.platform,
        accountId: result.account.accountId,
      },
    });

    return {
      account: account ? toConnectedAccountDto(account) : null,
      redirectUrl: result.redirect_url,
    };
  },

  async syncAccounts(workspaceId: string, userId?: string, ctx?: ClientContext) {
    socialProfileService.assertZernioEnabled();

    const profile = await socialProfileService.getByWorkspaceId(workspaceId);
    if (!profile) {
      return { synced: 0, accounts: [] };
    }

    const zernioAccounts = await zernioClient.listAccounts(profile.zernioProfileId);
    const healthMap = new Map<string, SocialAccountStatus>();

    try {
      const healthResults = await zernioClient.getAllAccountsHealth(profile.zernioProfileId);
      for (const h of healthResults) {
        const healthy =
          h.status === 'healthy' && (h.tokenStatus?.valid ?? true) && !h.issues?.length;
        healthMap.set(h.accountId, mapHealthToStatus({
          status: h.status,
          needsReconnect: h.status === 'error' || h.tokenStatus?.valid === false,
          healthy,
        }));
      }
    } catch {
      // Fall back to account list status only
    }

    const results = [];

    for (const za of zernioAccounts) {
      const account = await upsertFromZernio(workspaceId, profile.id, za, userId);
      if (!account) continue;

      const healthStatus = healthMap.get(za._id);
      if (healthStatus) {
        await prisma.connectedAccount.update({
          where: { id: account.id },
          data: { status: healthStatus },
        });
        results.push(toConnectedAccountDto({ ...account, status: healthStatus }));
      } else {
        results.push(toConnectedAccountDto(account));
      }
    }

    await auditService.record({
      action: AUDIT.SOCIAL_ACCOUNT_SYNCED,
      userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { workspaceId, count: results.length },
    });

    return { synced: results.length, accounts: results };
  },

  async disconnect(workspaceId: string, accountId: string, userId: string, ctx?: ClientContext) {
    socialProfileService.assertZernioEnabled();

    const account = await prisma.connectedAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) throw ApiError.notFound('Connected account not found.');

    try {
      await zernioClient.disconnectAccount(account.zernioAccountId);
    } catch {
      // Account may already be disconnected on Zernio side
    }

    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        status: SocialAccountStatus.DISCONNECTED,
        disconnectedAt: new Date(),
      },
    });

    await auditService.record({
      action: AUDIT.SOCIAL_ACCOUNT_DISCONNECTED,
      userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { workspaceId, platform: account.platform, accountId },
    });
  },

  async checkHealth(workspaceId: string, accountId: string) {
    socialProfileService.assertZernioEnabled();

    const account = await prisma.connectedAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) throw ApiError.notFound('Connected account not found.');

    try {
      const health = await zernioClient.checkAccountHealth(account.zernioAccountId);
      const status = mapHealthToStatus(health);
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status, lastSyncedAt: new Date() },
      });
      return {
        healthy: health.healthy,
        status: health.status,
        needsReconnect: health.needsReconnect,
        message: health.message,
      };
    } catch {
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status: SocialAccountStatus.ERROR },
      });
      return { healthy: false, message: 'Unable to verify account health.' };
    }
  },

  /** TikTok creator info (allowed privacy levels, interaction settings) for the composer. */
  async getTikTokCreatorInfo(workspaceId: string, accountId: string, mediaType: 'video' | 'photo') {
    socialProfileService.assertZernioEnabled();

    const account = await prisma.connectedAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) throw ApiError.notFound('Connected account not found.');
    if (account.platform !== SocialPlatform.TIKTOK) {
      throw ApiError.badRequest('This account is not a TikTok account.');
    }

    try {
      return await zernioClient.getTikTokCreatorInfo(account.zernioAccountId, mediaType);
    } catch {
      throw ApiError.serviceUnavailable('Could not load TikTok account settings. Try again.');
    }
  },
};
