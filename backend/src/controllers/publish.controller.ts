/**
 * src/controllers/publish.controller.ts
 */
import { Request, Response } from 'express';
import { publishJobService } from '../services/publishJob.service';
import { publishQueueService } from '../services/publishQueue.service';
import { getClientContext } from '../utils/requestContext';
import { ok } from '../utils/apiResponse';
import type { listPublishJobsQuerySchema } from '../validators/publish.validator';
import type { z } from 'zod';

type ListQuery = z.infer<typeof listPublishJobsQuerySchema>;

export const publishController = {
  async listJobs(req: Request, res: Response) {
    const query = req.query as unknown as ListQuery;
    const result = await publishJobService.list(req.params.workspaceId, {
      status: query.status,
      page: Number(query.page),
      limit: Number(query.limit),
    });
    return ok(res, result, 'OK');
  },

  async getJob(req: Request, res: Response) {
    const job = await publishJobService.get(req.params.workspaceId, req.params.jobId);
    return ok(res, { job }, 'OK');
  },

  async getLogs(req: Request, res: Response) {
    const logs = await publishJobService.getLogs(req.params.workspaceId, req.params.jobId);
    return ok(res, { logs }, 'OK');
  },

  async retryJob(req: Request, res: Response) {
    const job = await publishQueueService.retryJob(
      req.params.workspaceId,
      req.params.jobId,
      { userId: req.user!.id, ...getClientContext(req) },
    );
    return ok(res, { job }, 'Job retry queued.');
  },

  async queueStatus(_req: Request, res: Response) {
    return ok(res, {
      queueEnabled: publishQueueService.isQueueEnabled(),
    }, 'OK');
  },
};
