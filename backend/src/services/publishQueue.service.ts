/**
 * src/services/publishQueue.service.ts
 * Enqueues post publishing jobs via BullMQ with fallback to direct publish.
 */
import { PostStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { getPublishQueue, type PublishJobData } from '../queues/publish.queue';
import { publishJobService } from './publishJob.service';
import { postPublishService } from './postPublish.service';
import { auditService, AUDIT } from './audit.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

interface EnqueueContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const publishQueueService = {
  isQueueEnabled(): boolean {
    return env.redisEnabled;
  },

  async publishImmediately(
    postId: string,
    workspaceId: string,
    ctx?: EnqueueContext,
  ) {
    const existing = await publishJobService.findByPostId(postId);
    if (existing) {
      throw ApiError.badRequest('A publish job is already queued for this post.');
    }

    const dbJob = await publishJobService.create({ postId, workspaceId });
    await this.processPublishJob(dbJob.id, postId, workspaceId, ctx);
    return publishJobService.get(workspaceId, dbJob.id);
  },

  async enqueuePublish(
    postId: string,
    workspaceId: string,
    options?: { scheduledAt?: Date | null; immediate?: boolean },
    ctx?: EnqueueContext,
  ) {
    const existing = await publishJobService.findByPostId(postId);
    if (existing) {
      throw ApiError.badRequest('A publish job is already queued for this post.');
    }

    const scheduledFor = options?.immediate ? null : (options?.scheduledAt ?? null);
    const delay =
      scheduledFor && scheduledFor > new Date()
        ? scheduledFor.getTime() - Date.now()
        : 0;

    const dbJob = await publishJobService.create({
      postId,
      workspaceId,
      scheduledFor,
    });

    if (this.isQueueEnabled()) {
      const queue = getPublishQueue();
      const bullJob = await queue.add(
        'publish',
        {
          postId,
          workspaceId,
          publishJobId: dbJob.id,
          userId: ctx?.userId,
        } satisfies PublishJobData,
        {
          jobId: dbJob.id,
          delay: delay > 0 ? delay : undefined,
          attempts: env.PUBLISH_MAX_ATTEMPTS,
        },
      );

      await publishJobService.updateStatus(dbJob.id, delay > 0 ? 'DELAYED' : 'QUEUED', {
        bullJobId: bullJob.id,
      });

      await publishJobService.addLog(dbJob.id, 'info', 'Job enqueued in BullMQ', {
        bullJobId: bullJob.id,
        delayMs: delay,
      });
    } else {
      if (delay > 0) {
        logger.info({ postId, delay }, 'Redis unavailable — post remains scheduled for in-process poller');
        return dbJob;
      }

      await this.processPublishJob(dbJob.id, postId, workspaceId, ctx);
    }

    await auditService.record({
      action: AUDIT.PUBLISH_JOB_QUEUED,
      userId: ctx?.userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { workspaceId, postId, publishJobId: dbJob.id },
    });

    return publishJobService.get(workspaceId, dbJob.id);
  },

  async processPublishJob(
    publishJobId: string,
    postId: string,
    workspaceId: string,
    ctx?: EnqueueContext,
  ) {
    await publishJobService.updateStatus(publishJobId, 'ACTIVE', {
      startedAt: new Date(),
    });
    await publishJobService.addLog(publishJobId, 'info', 'Publish job started');

    try {
      await postPublishService.publishPost(postId, workspaceId);

      await publishJobService.updateStatus(publishJobId, 'COMPLETED', {
        completedAt: new Date(),
        errorMessage: null,
      });
      await publishJobService.addLog(publishJobId, 'info', 'Post published successfully');

      await auditService.record({
        action: AUDIT.PUBLISH_JOB_COMPLETED,
        userId: ctx?.userId,
        metadata: { workspaceId, postId, publishJobId },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      await publishJobService.updateStatus(publishJobId, 'FAILED', {
        completedAt: new Date(),
        errorMessage: message,
      });
      await publishJobService.addLog(publishJobId, 'error', message);

      await prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.FAILED },
      });

      await auditService.record({
        action: AUDIT.PUBLISH_JOB_FAILED,
        userId: ctx?.userId,
        metadata: { workspaceId, postId, publishJobId, error: message },
      });

      throw err;
    }
  },

  async retryJob(workspaceId: string, jobId: string, ctx?: EnqueueContext) {
    const job = await publishJobService.get(workspaceId, jobId);

    if (job.status !== 'FAILED' && job.status !== 'CANCELLED') {
      throw ApiError.badRequest('Only failed or cancelled jobs can be retried.');
    }

    if (job.attempt >= job.maxAttempts) {
      throw ApiError.badRequest('Maximum retry attempts reached.');
    }

    const post = await prisma.post.findFirst({
      where: { id: job.postId, workspaceId },
    });
    if (!post) throw ApiError.notFound('Post not found.');

    if (post.status === PostStatus.PUBLISHED) {
      throw ApiError.badRequest('Post is already published.');
    }

    await prisma.post.update({
      where: { id: job.postId },
      data: { status: PostStatus.DRAFT },
    });

    await publishJobService.updateStatus(jobId, 'QUEUED', {
      attempt: job.attempt + 1,
      errorMessage: null,
      startedAt: undefined,
      completedAt: undefined,
    });
    await publishJobService.addLog(jobId, 'info', `Retry attempt ${job.attempt + 1}`);

    if (this.isQueueEnabled()) {
      const queue = getPublishQueue();
      await queue.add(
        'publish-retry',
        {
          postId: job.postId,
          workspaceId,
          publishJobId: jobId,
          userId: ctx?.userId,
          attempt: job.attempt + 1,
        },
        { jobId: `${jobId}-retry-${Date.now()}` },
      );
    } else {
      await this.processPublishJob(jobId, job.postId, workspaceId, ctx);
    }

    await auditService.record({
      action: AUDIT.PUBLISH_JOB_RETRIED,
      userId: ctx?.userId,
      metadata: { workspaceId, postId: job.postId, publishJobId: jobId },
    });

    return publishJobService.get(workspaceId, jobId);
  },

  async syncScheduledPosts() {
    if (!this.isQueueEnabled()) return;

    const scheduled = await prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: { gt: new Date() },
      },
      select: { id: true, workspaceId: true, scheduledAt: true },
      take: 50,
    });

    for (const post of scheduled) {
      const existing = await publishJobService.findByPostId(post.id);
      if (existing) continue;

      try {
        await this.enqueuePublish(post.id, post.workspaceId, {
          scheduledAt: post.scheduledAt,
        });
      } catch (err) {
        logger.warn({ err, postId: post.id }, 'Failed to sync scheduled post to queue');
      }
    }
  },
};
