/**
 * src/workers/publish.worker.ts
 * BullMQ background worker that processes post publishing jobs.
 */
import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { getRedisConnection, closeRedisConnection } from '../config/redis';
import { closePublishQueue, PUBLISH_QUEUE_NAME, getPublishDeadLetterQueue, type PublishJobData } from '../queues/publish.queue';
import { publishQueueService } from '../services/publishQueue.service';
import { publishJobService } from '../services/publishJob.service';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

let worker: Worker<PublishJobData> | null = null;

export function startPublishWorker(): Worker<PublishJobData> {
  if (worker) return worker;

  worker = new Worker<PublishJobData>(
    PUBLISH_QUEUE_NAME,
    async (job: Job<PublishJobData>) => {
      const { postId, workspaceId, publishJobId, userId, attempt } = job.data;

      await publishJobService.updateStatus(publishJobId, 'ACTIVE', {
        attempt: attempt ?? job.attemptsMade + 1,
        startedAt: new Date(),
        bullJobId: job.id,
      });

      await publishJobService.addLog(publishJobId, 'info', `Worker processing job (attempt ${job.attemptsMade + 1})`, {
        bullJobId: job.id,
      });

      await publishQueueService.processPublishJob(publishJobId, postId, workspaceId, { userId });
    },
    {
      connection: getRedisConnection(),
      prefix: env.BULLMQ_PREFIX,
      concurrency: env.PUBLISH_WORKER_CONCURRENCY,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, postId: job.data.postId }, 'Publish job completed');
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    logger.error({ err, jobId: job.id, postId: job.data.postId }, 'Publish job failed');

    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? env.PUBLISH_MAX_ATTEMPTS);
    if (isLastAttempt) {
      await publishJobService.updateStatus(job.data.publishJobId, 'FAILED', {
        errorMessage: err.message,
        completedAt: new Date(),
      });
      await publishJobService.addLog(
        job.data.publishJobId,
        'error',
        `All attempts exhausted: ${err.message}`,
      );

      try {
        const dlq = getPublishDeadLetterQueue();
        await dlq.add('dead-letter', job.data, {
          jobId: `dlq-${job.data.publishJobId}-${Date.now()}`,
        });
        await publishJobService.addLog(
          job.data.publishJobId,
          'error',
          'Job moved to dead-letter queue after exhausting retries',
        );
      } catch (dlqErr) {
        logger.error({ dlqErr, publishJobId: job.data.publishJobId }, 'Failed to enqueue dead-letter job');
      }
    }
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Publish worker error');
  });

  logger.info({ concurrency: env.PUBLISH_WORKER_CONCURRENCY }, 'Publish worker started');
  return worker;
}

export async function stopPublishWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await closePublishQueue();
  await closeRedisConnection();
  await prisma.$disconnect();
}
