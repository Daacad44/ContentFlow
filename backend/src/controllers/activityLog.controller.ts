import { Request, Response } from 'express';
import { AuditCategory } from '@prisma/client';
import { activityLogService } from '../services/activityLog.service';
import { ok } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import type { listAuditLogsSchema, listLoginHistorySchema } from '../validators/activityLog.validator';
import type { z } from 'zod';

type ListAuditQuery = z.infer<typeof listAuditLogsSchema>;
type ListLoginQuery = z.infer<typeof listLoginHistorySchema>;

export const activityLogController = {
  async listAuditLogs(req: Request, res: Response) {
    const q = req.query as unknown as ListAuditQuery;
    const result = await activityLogService.listAuditLogs({
      userId: q.userId,
      workspaceId: q.workspaceId ?? req.params.workspaceId,
      category: q.category,
      severity: q.severity,
      action: q.action,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page,
      limit: q.limit,
    });
    return ok(res, result);
  },

  async getAuditLog(req: Request, res: Response) {
    const log = await activityLogService.getAuditLog(req.params.logId);
    if (!log) throw ApiError.notFound('Audit log not found.');
    return ok(res, { log });
  },

  async listLoginHistory(req: Request, res: Response) {
    const q = req.query as unknown as ListLoginQuery;
    const result = await activityLogService.listLoginHistory({
      userId: q.userId ?? req.user?.id,
      success: q.success,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page,
      limit: q.limit,
    });
    return ok(res, result);
  },

  async getSecuritySummary(req: Request, res: Response) {
    const summary = await activityLogService.getSecuritySummary(req.params.workspaceId);
    return ok(res, summary);
  },

  async getSystemHistory(req: Request, res: Response) {
    const q = req.query as unknown as ListAuditQuery;
    const result = await activityLogService.getSystemHistory({
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page,
      limit: q.limit,
    });
    return ok(res, result);
  },

  async listSecurityLogs(req: Request, res: Response) {
    const q = req.query as unknown as ListAuditQuery;
    const result = await activityLogService.listAuditLogs({
      category: AuditCategory.SECURITY,
      workspaceId: q.workspaceId,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      page: q.page,
      limit: q.limit,
    });
    return ok(res, result);
  },
};
