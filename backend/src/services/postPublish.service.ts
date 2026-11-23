/**
 * src/services/postPublish.service.ts
 * Publishes posts to connected social accounts via Zernio with platform verification.
 */
import { PostStatus, PostTargetStatus, SocialAccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { zernioClient } from '../lib/zernio.client';
import { toZernioPlatform } from '../config/socialPlatforms';
import {
  isConfirmedPlatformPublish,
  validatePlatformPublishRequirements,
  validateTikTokMedia,
} from '../config/postPublishRules';
import { readTikTokSettings } from '../utils/platformSettings';
import type { ZernioTikTokSettings } from '../lib/zernio.client';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

const postInclude = {
  media: { orderBy: { sortOrder: 'asc' as const } },
  targets: {
    include: {
      connectedAccount: {
        select: {
          id: true,
          platform: true,
          zernioAccountId: true,
          displayName: true,
          status: true,
        },
      },
    },
  },
  author: { select: { id: true, fullName: true, email: true } },
};

/** How long a platform may stay "processing" before the target is marked failed. */
const PENDING_TIMEOUT_MS = 2 * 60 * 60 * 1000;
/** How long to keep looking up a TikTok permalink after the post was accepted. */
const URL_LOOKUP_WINDOW_MS = 2 * 60 * 60 * 1000;

function toMediaType(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

function resolvePublicMediaUrl(url: string): string {
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return url.replace(env.API_URL, env.publicApiUrl);
  }
  return url;
}

function assertMediaReachable(mediaUrls: string[]) {
  const hasLocalOnly = mediaUrls.some(
    (url) =>
      (url.includes('localhost') || url.includes('127.0.0.1')) &&
      env.publicApiUrl.includes('localhost'),
  );
  if (hasLocalOnly) {
    throw ApiError.badRequest(
      'Attached media must be publicly accessible for social platforms to fetch. ' +
        'Set PUBLIC_API_URL in .env to your tunnel or production API URL (e.g. ngrok).',
    );
  }
}

export const postPublishService = {
  async publishPost(postId: string, workspaceId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: postInclude,
    });

    if (!post) throw ApiError.notFound('Post not found.');
    if (post.status === PostStatus.PUBLISHED) {
      throw ApiError.badRequest('Post is already published.');
    }
    if (post.status === PostStatus.PUBLISHING) {
      throw ApiError.badRequest('Post is currently being published.');
    }
    if (post.targets.length === 0) {
      throw ApiError.badRequest('Post has no target platforms.');
    }

    const inactive = post.targets.filter(
      (t) => t.connectedAccount.status !== SocialAccountStatus.CONNECTED,
    );
    if (inactive.length > 0) {
      throw ApiError.badRequest(
        'One or more connected accounts are not active. Reconnect them before publishing.',
      );
    }

    const mediaUrls = post.media.map((m) => resolvePublicMediaUrl(m.url));
    if (mediaUrls.length > 0) {
      assertMediaReachable(mediaUrls);
    }

    for (const target of post.targets) {
      const requirementError = validatePlatformPublishRequirements(
        target.connectedAccount.platform,
        post.media.length,
      );
      if (requirementError) {
        throw ApiError.badRequest(requirementError);
      }
    }

    const tiktokSettings = readTikTokSettings(post.platformSettings);
    if (post.targets.some((t) => t.connectedAccount.platform === 'TIKTOK')) {
      if (!tiktokSettings) {
        throw ApiError.badRequest('Choose TikTok settings (who can view, comments) before posting.');
      }
      const mediaError = validateTikTokMedia(post.media);
      if (mediaError) throw ApiError.badRequest(mediaError);
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    let anyFailed = false;
    let anyPending = false;

    for (const target of post.targets) {
      if (target.status === PostTargetStatus.PUBLISHED) {
        continue;
      }

      await prisma.postTarget.update({
        where: { id: target.id },
        data: { status: PostTargetStatus.PUBLISHING, errorMessage: null },
      });

      try {
        const isTikTok = target.connectedAccount.platform === 'TIKTOK';
        const result = await publishToAccount({
          platform: toZernioPlatform(target.connectedAccount.platform),
          zernioAccountId: target.connectedAccount.zernioAccountId,
          content: post.content,
          media: post.media.map((m) => ({
            type: toMediaType(m.mimeType),
            url: resolvePublicMediaUrl(m.url),
            title: m.filename,
          })),
          tiktokSettings: isTikTok && tiktokSettings ? tiktokSettings : undefined,
        });

        if (result.state === 'pending') {
          anyPending = true;
          await prisma.postTarget.update({
            where: { id: target.id },
            data: { status: PostTargetStatus.PUBLISHING, zernioPostId: result.zernioPostId },
          });
          logger.info(
            { postId, targetId: target.id, zernioPostId: result.zernioPostId },
            'Platform is still processing the post; cron will confirm it',
          );
          continue;
        }

        await prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostTargetStatus.PUBLISHED,
            externalPostId: result.externalPostId,
            platformPostUrl: result.platformPostUrl ?? null,
            zernioPostId: result.zernioPostId,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });

        logger.info(
          {
            postId,
            targetId: target.id,
            externalPostId: result.externalPostId,
            platformPostUrl: result.platformPostUrl,
          },
          'Platform confirmed post delivery',
        );
      } catch (err) {
        anyFailed = true;
        const message = err instanceof Error ? err.message : 'Publish failed.';
        logger.warn({ err, postId, targetId: target.id }, 'Failed to publish to target');

        await prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostTargetStatus.FAILED,
            errorMessage: message,
          },
        });
      }
    }

    const updated = await refreshPostStatus(postId);

    if (anyFailed) {
      throw ApiError.badRequest(
        'Post failed to publish to one or more platforms. Check target errors for details.',
      );
    }
    if (anyPending) {
      logger.info({ postId }, 'Post accepted; waiting for platform confirmation');
    }

    return updated;
  },

  /**
   * Confirms targets the platform was still processing (videos, TikTok) and fills in
   * TikTok permalinks that appear minutes after publishing. Called by the cron runner.
   */
  async reconcilePendingTargets(limit = 25): Promise<{ checked: number; published: number; failed: number }> {
    const summary = { checked: 0, published: 0, failed: 0 };
    if (!env.zernioEnabled) return summary;

    const now = Date.now();
    const targets = await prisma.postTarget.findMany({
      where: {
        zernioPostId: { not: null },
        OR: [
          { status: PostTargetStatus.PUBLISHING },
          {
            status: PostTargetStatus.PUBLISHED,
            platformPostUrl: null,
            publishedAt: { gte: new Date(now - URL_LOOKUP_WINDOW_MS) },
          },
        ],
      },
      include: { connectedAccount: { select: { platform: true, zernioAccountId: true } } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });

    const touchedPosts = new Set<string>();

    for (const target of targets) {
      summary.checked++;
      const platform = toZernioPlatform(target.connectedAccount.platform);
      try {
        const zernioPost = await zernioClient.getPost(target.zernioPostId!);
        const result = zernioClient.mapPostToCreateResult(
          zernioPost,
          target.connectedAccount.zernioAccountId,
          platform,
        );
        const status = (result.platformStatus || result.status || '').toLowerCase();

        if (target.status === PostTargetStatus.PUBLISHED) {
          if (result.platformPostUrl) {
            await prisma.postTarget.update({
              where: { id: target.id },
              data: {
                platformPostUrl: result.platformPostUrl,
                externalPostId: result.platformPostId?.trim() || target.externalPostId,
              },
            });
          }
          continue;
        }

        if (result.errorMessage || status === 'failed' || status === 'error' || status === 'rejected') {
          await prisma.postTarget.update({
            where: { id: target.id },
            data: {
              status: PostTargetStatus.FAILED,
              errorMessage: result.errorMessage ?? `Platform rejected the post (status: ${status}).`,
            },
          });
          summary.failed++;
          touchedPosts.add(target.postId);
        } else if (isConfirmedPlatformPublish(result)) {
          await prisma.postTarget.update({
            where: { id: target.id },
            data: {
              status: PostTargetStatus.PUBLISHED,
              externalPostId: result.platformPostId?.trim() || target.zernioPostId,
              platformPostUrl: result.platformPostUrl ?? null,
              publishedAt: new Date(),
              errorMessage: null,
            },
          });
          summary.published++;
          touchedPosts.add(target.postId);
        } else if (now - target.updatedAt.getTime() > PENDING_TIMEOUT_MS) {
          await prisma.postTarget.update({
            where: { id: target.id },
            data: {
              status: PostTargetStatus.FAILED,
              errorMessage: 'The platform did not confirm the post within 2 hours.',
            },
          });
          summary.failed++;
          touchedPosts.add(target.postId);
        }
      } catch (err) {
        logger.warn({ err, targetId: target.id }, 'Could not reconcile pending post target');
      }
    }

    for (const postId of touchedPosts) {
      await refreshPostStatus(postId);
    }

    return summary;
  },
};

/**
 * Derives the post status from its targets: published when all are live, publishing while
 * any platform is still processing, failed otherwise.
 */
async function refreshPostStatus(postId: string) {
  const targets = await prisma.postTarget.findMany({
    where: { postId },
    select: { status: true },
  });
  const statuses = targets.map((t) => t.status);
  const allPublished = statuses.every((s) => s === PostTargetStatus.PUBLISHED);
  const anyPending = statuses.some(
    (s) => s === PostTargetStatus.PUBLISHING || s === PostTargetStatus.PENDING,
  );
  const anyPublished = statuses.some((s) => s === PostTargetStatus.PUBLISHED);

  const status = allPublished
    ? PostStatus.PUBLISHED
    : anyPending
      ? PostStatus.PUBLISHING
      : PostStatus.FAILED;

  return prisma.post.update({
    where: { id: postId },
    data: {
      status,
      ...(anyPublished && { publishedAt: new Date() }),
    },
    include: postInclude,
  });
}

type PublishOutcome =
  | { state: 'published'; externalPostId: string; platformPostUrl?: string; zernioPostId?: string }
  | { state: 'pending'; zernioPostId: string };

/** Polls Zernio briefly; anything slower is left to reconcilePendingTargets. */
const CONFIRM_ATTEMPTS = 8;
const CONFIRM_INTERVAL_MS = 5_000;

async function publishToAccount(params: {
  platform: string;
  zernioAccountId: string;
  content: string;
  media: Array<{ type: 'image' | 'video'; url: string; title?: string }>;
  tiktokSettings?: ZernioTikTokSettings;
}): Promise<PublishOutcome> {
  if (!env.zernioEnabled) {
    if (env.allowSimulatedPublish) {
      logger.warn(
        { accountId: params.zernioAccountId },
        'Zernio disabled — simulated publish (dev only)',
      );
      return { state: 'published', externalPostId: `sim-${Date.now()}` };
    }
    throw new Error(
      'Social publishing is not configured (ZERNIO_API_KEY missing). Cannot publish to connected accounts.',
    );
  }

  const health = await zernioClient.checkAccountHealth(params.zernioAccountId);
  if (!health.healthy) {
    throw new Error(
      health.message ??
        `Connected account is not healthy (${health.status}). Reconnect the account before publishing.`,
    );
  }

  let result = await zernioClient.createPost({
    platform: params.platform,
    accountId: params.zernioAccountId,
    content: params.content,
    mediaItems: params.media.length > 0 ? params.media : undefined,
    publishNow: true,
    tiktokSettings: params.tiktokSettings,
  });

  for (let attempt = 0; ; attempt++) {
    if (result.errorMessage) throw new Error(result.errorMessage);

    const status = (result.platformStatus || result.status || '').toLowerCase();
    if (status === 'failed' || status === 'error' || status === 'rejected') {
      throw new Error(`Platform rejected the post (status: ${result.platformStatus || result.status}).`);
    }

    if (isConfirmedPlatformPublish(result)) {
      return {
        state: 'published',
        externalPostId: result.platformPostId?.trim() || result.postId,
        platformPostUrl: result.platformPostUrl,
        zernioPostId: result.postId,
      };
    }

    if (attempt >= CONFIRM_ATTEMPTS) {
      return { state: 'pending', zernioPostId: result.postId };
    }

    await new Promise((r) => setTimeout(r, CONFIRM_INTERVAL_MS));
    const latest = await zernioClient.getPost(result.postId);
    result = zernioClient.mapPostToCreateResult(latest, params.zernioAccountId, params.platform);
  }
}
