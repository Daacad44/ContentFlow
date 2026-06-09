/**
 * src/services/postScheduler.service.ts
 * Background worker that publishes posts when their scheduled time arrives.
 */
import { PostStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { postPublishService } from './postPublish.service';
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

  async processDuePosts() {
    if (processing) return;
    processing = true;

    try {
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: { lte: new Date() },
        },
        select: { id: true, workspaceId: true },
        take: 20,
      });

      for (const post of duePosts) {
        try {
          await postPublishService.publishPost(post.id, post.workspaceId);
          logger.info({ postId: post.id }, 'Scheduled post published');
        } catch (err) {
          logger.error({ err, postId: post.id }, 'Failed to publish scheduled post');
          await prisma.post.update({
            where: { id: post.id },
            data: { status: PostStatus.FAILED },
          });
        }
      }
    } finally {
      processing = false;
    }
  },
};

async function processDuePosts() {
  return postSchedulerService.processDuePosts();
}
