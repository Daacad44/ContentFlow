/**
 * src/services/postPublish.service.ts
 * Publishes posts to connected social accounts via Zernio (or simulates in dev).
 */
import { PostStatus, PostTargetStatus, SocialAccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { zernioClient } from '../lib/zernio.client';
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

    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    const mediaUrls = post.media.map((m) => m.url);
    let allSucceeded = true;

    for (const target of post.targets) {
      await prisma.postTarget.update({
        where: { id: target.id },
        data: { status: PostTargetStatus.PUBLISHING },
      });

      try {
        const result = await publishToAccount({
          zernioAccountId: target.connectedAccount.zernioAccountId,
          content: post.content,
          mediaUrls,
        });

        await prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostTargetStatus.PUBLISHED,
            externalPostId: result.externalPostId,
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

    return updated;
  },
};

async function publishToAccount(params: {
  zernioAccountId: string;
  content: string;
  mediaUrls: string[];
}): Promise<{ externalPostId: string | null }> {
  if (env.zernioEnabled) {
    const result = await zernioClient.createPost({
      accountId: params.zernioAccountId,
      content: params.content,
      mediaUrls: params.mediaUrls.length > 0 ? params.mediaUrls : undefined,
    });
    return { externalPostId: result.postId ?? result.id ?? null };
  }

  // Dev fallback when Zernio is not configured.
  logger.info(
    { accountId: params.zernioAccountId },
    'Zernio disabled — simulating publish',
  );
  return { externalPostId: `sim-${Date.now()}` };
}
