/**
 * src/services/post.service.ts
 * Create, read, update, delete, and schedule workspace posts.
 */
import { PostStatus, Prisma, SocialAccountStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { auditService, AUDIT } from './audit.service';
import { postPublishService } from './postPublish.service';
import { ApiError } from '../utils/apiError';
import type { CreatePostInput, UpdatePostInput } from '../validators/post.validator';

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
      errorMessage: t.errorMessage,
      publishedAt: t.publishedAt,
      connectedAccount: t.connectedAccount,
    })),
  };
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
    await validateConnectedAccounts(workspaceId, input.connectedAccountIds);

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date() && !input.saveAsDraft) {
      throw ApiError.badRequest('Scheduled time must be in the future.');
    }

    const status = resolveStatus(input.saveAsDraft, scheduledAt);

    const post = await prisma.post.create({
      data: {
        workspaceId,
        authorId: userId,
        content: input.content,
        status,
        scheduledAt: status === PostStatus.SCHEDULED ? scheduledAt : null,
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
    });
    if (!existing) throw ApiError.notFound('Post not found.');

    if (
      existing.status !== PostStatus.DRAFT &&
      existing.status !== PostStatus.SCHEDULED &&
      existing.status !== PostStatus.FAILED
    ) {
      throw ApiError.badRequest('Only draft, scheduled, or failed posts can be edited.');
    }

    if (input.connectedAccountIds) {
      await validateConnectedAccounts(workspaceId, input.connectedAccountIds);
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
      await prisma.post.update({
        where: { id: postId },
        data: { scheduledAt: null, status: PostStatus.DRAFT },
      });
    }

    const post = await postPublishService.publishPost(postId, workspaceId);

    await auditService.record({
      action: AUDIT.POST_PUBLISHED,
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { workspaceId, postId, status: post.status },
    });

    return toPostDto(post);
  },
};
