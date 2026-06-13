/**
 * src/queues/publish.queue.ts
 * BullMQ queue for post publishing jobs with dead-letter handling.
 */
import { Queue } from 'bullmq';
import { env } from '../config/env';
import { getRedisConnection } from '../config/redis';

export const PUBLISH_QUEUE_NAME = 'publish-post';
export const PUBLISH_DLQ_NAME = 'publish-dead-letter';

export interface PublishJobData {
  postId: string;
  workspaceId: string;
  publishJobId: string;
  userId?: string;
  attempt?: number;
}

let publishQueue: Queue<PublishJobData> | null = null;
let deadLetterQueue: Queue<PublishJobData> | null = null;

const defaultJobOptions = {
  attempts: env.PUBLISH_MAX_ATTEMPTS,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

export function getPublishQueue(): Queue<PublishJobData> {
  if (!publishQueue) {
    publishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE_NAME, {
      connection: getRedisConnection(),
      prefix: env.BULLMQ_PREFIX,
      defaultJobOptions,
    });
  }
  return publishQueue;
}

export function getPublishDeadLetterQueue(): Queue<PublishJobData> {
  if (!deadLetterQueue) {
    deadLetterQueue = new Queue<PublishJobData>(PUBLISH_DLQ_NAME, {
      connection: getRedisConnection(),
      prefix: env.BULLMQ_PREFIX,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: false,
      },
    });
  }
  return deadLetterQueue;
}

export async function closePublishQueue(): Promise<void> {
  if (publishQueue) {
    await publishQueue.close();
    publishQueue = null;
  }
  if (deadLetterQueue) {
    await deadLetterQueue.close();
    deadLetterQueue = null;
  }
}
