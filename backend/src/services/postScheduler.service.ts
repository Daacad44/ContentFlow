/**
 * src/services/postScheduler.service.ts
 * Background worker that publishes posts when their scheduled time arrives.
 */
import { PostStatus, PublishJobStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { publishQueueService } from './publishQueue.service';
import { publishJobService } from './publishJob.service';
import { logger } from '../utils/logger';

const POLL_INTERVAL_MS = 60_000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let processing = false;

export const postSchedulerService = {
  start() {
    if (intervalHandle) return;

    logger.info('Post scheduler started (polling every 60s)');
    void processDuePosts();

    intervalHandle = setInterval(() => {
      void processDuePosts();
    }, POLL_INTERVAL_MS);
    intervalHandle.unref?.();
  },

  stop() {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  },

  /**
   * Publishes every post whose scheduled time has passed. Safe to call concurrently
   * (in-process poller, Vercel Cron, Supabase pg_cron): each post's publish job is claimed
   * atomically, so a post is never published twice.
   */
  async processDuePosts(limit = 20): Promise<{ due: number; published: number; failed: number; skipped: number }> {
    const summary = { due: 0, published: 0, failed: 0, skipped: 0 };
    if (processing) return summary;
    processing = true;

    try {
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: { lte: new Date() },
        },
        select: { id: true, workspaceId: true },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
      });
      summary.due = duePosts.length;

      for (const post of duePosts) {
        const jobId = await claimPublishJob(post.id, post.workspaceId);
        if (!jobId) {
          summary.skipped++;
          continue;
        }

        try {
          await publishQueueService.processPublishJob(jobId, post.id, post.workspaceId);
          summary.published++;
          logger.info({ postId: post.id }, 'Scheduled post published');
        } catch (err) {
          // processPublishJob already marked the job and post as FAILED.
          summary.failed++;
          logger.error({ err, postId: post.id }, 'Failed to publish scheduled post');
        }
      }
    } finally {
      processing = false;
    }

    return summary;
  },
};

/**
 * Atomically moves the post's pending publish job to ACTIVE and returns its id, creating a job
 * if the post has none. Returns null when another runner already claimed it.
 */
async function claimPublishJob(postId: string, workspaceId: string): Promise<string | null> {
  const existing = await prisma.publishJob.findFirst({
    where: { postId, status: { in: [PublishJobStatus.QUEUED, PublishJobStatus.DELAYED, PublishJobStatus.ACTIVE] } },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const claimed = await prisma.publishJob.updateMany({
      where: { id: existing.id, status: { in: [PublishJobStatus.QUEUED, PublishJobStatus.DELAYED] } },
      data: { status: PublishJobStatus.ACTIVE, startedAt: new Date() },
    });
    return claimed.count === 1 ? existing.id : null;
  }

  const job = await publishJobService.create({ postId, workspaceId });
  const claimed = await prisma.publishJob.updateMany({
    where: { id: job.id, status: PublishJobStatus.QUEUED },
    data: { status: PublishJobStatus.ACTIVE, startedAt: new Date() },
  });
  return claimed.count === 1 ? job.id : null;
}

async function processDuePosts() {
  return postSchedulerService.processDuePosts();
}
