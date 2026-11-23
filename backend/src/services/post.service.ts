/**
 * src/services/post.service.ts
 * Create, read, update, delete, and schedule workspace posts.
 */
import {
  PostStatus,
  Prisma,
  PublishJobStatus,
  SocialAccountStatus,
  SocialPlatform,
  UsageMetric,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { auditService, AUDIT } from './audit.service';
import { publishQueueService } from './publishQueue.service';
import { billingService } from './billing.service';
import { ApiError } from '../utils/apiError';
import { validateTikTokMedia } from '../config/postPublishRules';
import { readTikTokSettings } from '../utils/platformSettings';
import type { CreatePostInput, UpdatePostInput, TikTokSettings } from '../validators/post.validator';

interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

const postInclude = {
  media: { orderBy: { sortOrder: 'asc' as const } },
  targets: {
    include: {
      connectedAccount: {
        select: {
          id: true,
          platform: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          status: true,
        },
      },
    },
  },
  author: { select: { id: true, fullName: true, email: true } },
};

function toPostDto(post: Prisma.PostGetPayload<{ include: typeof postInclude }>) {
  return {
    id: post.id,
    workspaceId: post.workspaceId,
    content: post.content,
    status: post.status,
    scheduledAt: post.scheduledAt,
    publishedAt: post.publishedAt,
    tiktokSettings: readTikTokSettings(post.platformSettings),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    media: post.media.map((m) => ({
      id: m.id,
      url: m.url,
      filename: m.filename,
      mimeType: m.mimeType,
      size: m.size,
      sortOrder: m.sortOrder,
    })),
    targets: post.targets.map((t) => ({
      id: t.id,
      status: t.status,
      externalPostId: t.externalPostId,
      platformPostUrl: t.platformPostUrl,
      errorMessage: t.errorMessage,
      publishedAt: t.publishedAt,
      connectedAccount: t.connectedAccount,
    })),
  };
}

/** Cancels a post's not-yet-started publish jobs so it can be rescheduled or published now. */
async function cancelPendingPublishJobs(postId: string) {
  await prisma.publishJob.updateMany({
    where: { postId, status: { in: [PublishJobStatus.QUEUED, PublishJobStatus.DELAYED] } },
    data: { status: PublishJobStatus.CANCELLED, completedAt: new Date() },
  });
}

/**
 * Rejects early what TikTok would reject at publish time. Drafts are not checked. Missing
 * settings are fine: publishing falls back to DEFAULT_TIKTOK_SETTINGS.
 */
function assertTikTokReady(
  hasTikTok: boolean,
  _settings: TikTokSettings | null | undefined,
  media: Array<{ mimeType: string }>,
) {
  if (!hasTikTok) return;
  const mediaError = validateTikTokMedia(media);
  if (mediaError) throw ApiError.badRequest(mediaError);
}

async function validateConnectedAccounts(workspaceId: string, accountIds: string[]) {
  const accounts = await prisma.connectedAccount.findMany({
    where: {
      id: { in: accountIds },
      workspaceId,
      status: SocialAccountStatus.CONNECTED,
    },
  });

  if (accounts.length !== accountIds.length) {
    throw ApiError.badRequest(
      'One or more selected accounts are invalid or disconnected.',
    );
  }

  return accounts;
}

function resolveStatus(
  saveAsDraft: boolean,
  scheduledAt: Date | null | undefined,
): PostStatus {
  if (saveAsDraft) return PostStatus.DRAFT;
  if (scheduledAt && scheduledAt > new Date()) return PostStatus.SCHEDULED;
  return PostStatus.DRAFT;
}

export const postService = {
  async list(
    workspaceId: string,
    query: { status?: PostStatus; page: number; limit: number },
  ) {
    const where: Prisma.PostWhereInput = { workspaceId };
    if (query.status) where.status = query.status;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map(toPostDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async get(workspaceId: string, postId: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: postInclude,
    });
    if (!post) throw ApiError.notFound('Post not found.');
    return toPostDto(post);
  },

  async create(
    workspaceId: string,
    userId: string,
    input: CreatePostInput,
    ctx: ClientContext,
  ) {
    const accounts = await validateConnectedAccounts(workspaceId, input.connectedAccountIds);
    if (!input.saveAsDraft) {
      assertTikTokReady(
        accounts.some((a) => a.platform === SocialPlatform.TIKTOK),
        input.tiktokSettings,
        input.media ?? [],
      );
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date() && !input.saveAsDraft) {
      throw ApiError.badRequest('Scheduled time must be in the future.');
    }

    await billingService.assertWithinLimit(workspaceId, UsageMetric.POSTS);

    const status = resolveStatus(input.saveAsDraft, scheduledAt);

    const post = await prisma.post.create({
      data: {
        workspaceId,
        authorId: userId,
        content: input.content,
        status,
        scheduledAt: status === PostStatus.SCHEDULED ? scheduledAt : null,
        ...(input.tiktokSettings && { platformSettings: { tiktok: input.tiktokSettings } }),
        media: {
          create: (input.media ?? []).map((m, i) => ({
            url: m.url,
            filename: m.filename,
            mimeType: m.mimeType,
            size: m.size,
            sortOrder: i,
          })),
        },
        targets: {
          create: input.connectedAccountIds.map((connectedAccountId) => ({
            connectedAccountId,
          })),
        },
      },
      include: postInclude,
    });

    await auditService.record({
      action: AUDIT.POST_CREATED,
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { workspaceId, postId: post.id, status: post.status },
    });

    await billingService.trackUsage(workspaceId, UsageMetric.POSTS);

    if (post.status === PostStatus.SCHEDULED && post.scheduledAt) {
      await publishQueueService.enqueuePublish(post.id, workspaceId, {
        scheduledAt: post.scheduledAt,
      }, { userId, ...ctx });
    }

    return toPostDto(post);
  },

  async update(
    workspaceId: string,
    postId: string,
    userId: string,
    input: UpdatePostInput,
    ctx: ClientContext,
  ) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: {
        media: { select: { mimeType: true } },
        targets: { select: { connectedAccount: { select: { platform: true } } } },
      },
    });
    if (!existing) throw ApiError.notFound('Post not found.');

    if (
      existing.status !== PostStatus.DRAFT &&
      existing.status !== PostStatus.SCHEDULED &&
      existing.status !== PostStatus.FAILED
    ) {
      throw ApiError.badRequest('Only draft, scheduled, or failed posts can be edited.');
    }

    let platforms = existing.targets.map((t) => t.connectedAccount.platform);
    if (input.connectedAccountIds) {
      const accounts = await validateConnectedAccounts(workspaceId, input.connectedAccountIds);
      platforms = accounts.map((a) => a.platform);
    }


    let scheduledAt: Date | null | undefined = undefined;
    if (input.scheduledAt !== undefined) {
      scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
      if (scheduledAt && scheduledAt <= new Date()) {
        throw ApiError.badRequest('Scheduled time must be in the future.');
      }
    }

    let status: PostStatus | undefined;
    if (input.saveAsDraft === true) {
      status = PostStatus.DRAFT;
      scheduledAt = null;
    } else if (input.saveAsDraft === false || scheduledAt) {
      const nextScheduled =
        scheduledAt !== undefined ? scheduledAt : existing.scheduledAt;
      if (nextScheduled && nextScheduled > new Date()) {
        status = PostStatus.SCHEDULED;
      } else if (input.saveAsDraft === false && !nextScheduled) {
        status = PostStatus.DRAFT;
      }
    }

    // Drafts may be incomplete; anything heading for a platform must satisfy TikTok's rules.
    if ((status ?? existing.status) !== PostStatus.DRAFT) {
      assertTikTokReady(
        platforms.includes(SocialPlatform.TIKTOK),
        input.tiktokSettings !== undefined
          ? input.tiktokSettings
          : readTikTokSettings(existing.platformSettings),
        input.media ?? existing.media,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.connectedAccountIds) {
        await tx.postTarget.deleteMany({ where: { postId } });
        await tx.postTarget.createMany({
          data: input.connectedAccountIds.map((connectedAccountId) => ({
            postId,
            connectedAccountId,
          })),
        });
      }

      if (input.media !== undefined) {
        await tx.postMedia.deleteMany({ where: { postId } });
        if (input.media.length > 0) {
          await tx.postMedia.createMany({
            data: input.media.map((m, i) => ({
              postId,
              url: m.url,
              filename: m.filename,
              mimeType: m.mimeType,
              size: m.size,
              sortOrder: i,
            })),
          });
        }
      }

      return tx.post.update({
        where: { id: postId },
        data: {
          ...(input.content !== undefined && { content: input.content }),
          ...(input.tiktokSettings !== undefined && {
            platformSettings: input.tiktokSettings
              ? { tiktok: input.tiktokSettings }
              : Prisma.DbNull,
          }),
          ...(status !== undefined && { status }),
          ...(scheduledAt !== undefined && {
            scheduledAt: status === PostStatus.SCHEDULED ? scheduledAt : null,
          }),
        },
        include: postInclude,
      });
    });

    await auditService.record({
      action: AUDIT.POST_UPDATED,
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { workspaceId, postId, status: updated.status },
    });

    if (existing.status === PostStatus.SCHEDULED || updated.status === PostStatus.SCHEDULED) {
      await cancelPendingPublishJobs(updated.id);
    }

    if (updated.status === PostStatus.SCHEDULED && updated.scheduledAt) {
      await publishQueueService.enqueuePublish(updated.id, workspaceId, {
        scheduledAt: updated.scheduledAt,
      }, { userId, ...ctx });
    }

    return toPostDto(updated);
  },

  async remove(
    workspaceId: string,
    postId: string,
    userId: string,
    ctx: ClientContext,
  ) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });
    if (!existing) throw ApiError.notFound('Post not found.');

    if (existing.status === PostStatus.PUBLISHING) {
      throw ApiError.badRequest('Cannot delete a post while it is publishing.');
    }

    await prisma.post.delete({ where: { id: postId } });

    await auditService.record({
      action: AUDIT.POST_DELETED,
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { workspaceId, postId },
    });
  },

  async publishNow(
    workspaceId: string,
    postId: string,
    userId: string,
    ctx: ClientContext,
  ) {
    const existing = await prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });
    if (!existing) throw ApiError.notFound('Post not found.');

    if (
      existing.status !== PostStatus.DRAFT &&
      existing.status !== PostStatus.SCHEDULED &&
      existing.status !== PostStatus.FAILED
    ) {
      throw ApiError.badRequest('This post cannot be published.');
    }

    // Clear schedule when publishing immediately.
    if (existing.status === PostStatus.SCHEDULED) {
      await cancelPendingPublishJobs(postId);
      await prisma.post.update({
        where: { id: postId },
        data: { scheduledAt: null, status: PostStatus.DRAFT },
      });
    }

    await publishQueueService.publishImmediately(postId, workspaceId, {
      userId,
      ...ctx,
    });

    const post = await this.get(workspaceId, postId);

    await auditService.record({
      action: AUDIT.POST_PUBLISHED,
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { workspaceId, postId, status: post.status },
    });

    return post;
  },
};
