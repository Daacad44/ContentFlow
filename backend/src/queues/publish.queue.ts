/**
 * src/queues/publish.queue.ts
 * BullMQ queue for post publishing jobs.
 */
import { Queue } from 'bullmq';
import { env } from '../config/env';
import { getRedisConnection } from '../config/redis';

export const PUBLISH_QUEUE_NAME = 'publish-post';

export interface PublishJobData {
  postId: string;
  workspaceId: string;
  publishJobId: string;
  userId?: string;
  attempt?: number;
}

let publishQueue: Queue<PublishJobData> | null = null;

export function getPublishQueue(): Queue<PublishJobData> {
  if (!publishQueue) {
    publishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE_NAME, {
      connection: getRedisConnection(),
      prefix: env.BULLMQ_PREFIX,
      defaultJobOptions: {
        attempts: env.PUBLISH_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return publishQueue;
}

export async function closePublishQueue(): Promise<void> {
  if (publishQueue) {
    await publishQueue.close();
    publishQueue = null;
  }
}
