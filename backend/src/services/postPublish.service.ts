/**
 * src/services/postPublish.service.ts
 * Publishes posts to connected social accounts via Zernio (or simulates in dev).
 */
import { PostStatus, PostTargetStatus, SocialAccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { zernioClient } from '../lib/zernio.client';
import { toZernioPlatform } from '../config/socialPlatforms';
import {
  isConfirmedPlatformPublish,
  validatePlatformPublishRequirements,
} from '../config/postPublishRules';
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

    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    let allSucceeded = true;

    for (const target of post.targets) {
      await prisma.postTarget.update({
        where: { id: target.id },
        data: { status: PostTargetStatus.PUBLISHING },
      });

      try {
        const result = await publishToAccount({
          platform: toZernioPlatform(target.connectedAccount.platform),
          zernioAccountId: target.connectedAccount.zernioAccountId,
          content: post.content,
          media: post.media.map((m) => ({
            type: toMediaType(m.mimeType),
            url: resolvePublicMediaUrl(m.url),
            title: m.filename,
          })),
        });

        await prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostTargetStatus.PUBLISHED,
            externalPostId: result.externalPostId,
            platformPostUrl: result.platformPostUrl ?? null,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });
      } catch (err) {
        allSucceeded = false;
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

    const finalStatus = allSucceeded ? PostStatus.PUBLISHED : PostStatus.FAILED;
    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        status: finalStatus,
        publishedAt: allSucceeded ? new Date() : null,
      },
      include: postInclude,
    });

    if (!allSucceeded) {
      throw ApiError.badRequest(
        'Post failed to publish to one or more platforms. Check target errors for details.',
      );
    }

    return updated;
  },
};

async function publishToAccount(params: {
  platform: string;
  zernioAccountId: string;
  content: string;
  media: Array<{ type: 'image' | 'video'; url: string; title?: string }>;
}): Promise<{ externalPostId: string | null; platformPostUrl?: string }> {
  if (env.zernioEnabled) {
    const result = await zernioClient.createPost({
      platform: params.platform,
      accountId: params.zernioAccountId,
      content: params.content,
      mediaItems: params.media.length > 0 ? params.media : undefined,
      publishNow: true,
    });

    if (result.errorMessage) {
      throw new Error(result.errorMessage);
    }

    if (!isConfirmedPlatformPublish(result)) {
      throw new Error(
        result.errorMessage ??
          `Publish was not confirmed by the platform (status: ${result.platformStatus || result.status}). ` +
            'The post may have been saved as a draft in Zernio only.',
      );
    }

    return {
      externalPostId: result.platformPostId ?? result.postId,
      platformPostUrl: result.platformPostUrl,
    };
  }

  logger.info(
    { accountId: params.zernioAccountId },
    'Zernio disabled — simulating publish',
  );
  return { externalPostId: `sim-${Date.now()}` };
}
