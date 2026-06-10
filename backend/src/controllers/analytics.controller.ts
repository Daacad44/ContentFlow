import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { ok, created } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import type { analyticsDateRangeSchema, generateReportSchema } from '../validators/analytics.validator';
import type { z } from 'zod';

type DateRangeQuery = z.infer<typeof analyticsDateRangeSchema>;
type GenerateReportBody = z.infer<typeof generateReportSchema>;

function parseRange(query: DateRangeQuery) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const analyticsController = {
  async dashboard(req: Request, res: Response) {
    const metrics = await analyticsService.getDashboardMetrics(req.params.workspaceId);
    return ok(res, { metrics });
  },

  async engagement(req: Request, res: Response) {
    const range = parseRange(req.query as unknown as DateRangeQuery);
    const data = await analyticsService.getEngagementAnalytics(req.params.workspaceId, range);
    return ok(res, { engagement: data, range });
  },

  async reach(req: Request, res: Response) {
    const range = parseRange(req.query as unknown as DateRangeQuery);
    const data = await analyticsService.getReachAnalytics(req.params.workspaceId, range);
    return ok(res, { reach: data, range });
  },

  async growth(req: Request, res: Response) {
    const range = parseRange(req.query as unknown as DateRangeQuery);
    const data = await analyticsService.getGrowthAnalytics(req.params.workspaceId, range);
    return ok(res, { growth: data, range });
  },

  async performance(req: Request, res: Response) {
    const range = parseRange(req.query as unknown as DateRangeQuery);
    const data = await analyticsService.getPerformanceReport(req.params.workspaceId, range);
    return ok(res, { report: data, range });
  },

  async listReports(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await analyticsService.listReports(req.params.workspaceId, page, limit);
    return ok(res, result);
  },

  async getReport(req: Request, res: Response) {
    const report = await analyticsService.getReport(req.params.workspaceId, req.params.reportId);
    if (!report) throw ApiError.notFound('Report not found.');
    return ok(res, { report });
  },

  async generateReport(req: Request, res: Response) {
    const body = req.body as GenerateReportBody;
    const report = await analyticsService.generateReport(
      req.params.workspaceId,
      req.user!.id,
      {
        title: body.title,
        type: body.type,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
      },
    );
    return created(res, { report }, 'Report generated.');
  },
};
