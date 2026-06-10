import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { adminService } from '../services/admin.service';
import { auditService, AUDIT } from '../services/audit.service';
import { ok } from '../utils/apiResponse';
import type { revenueRangeSchema, upsertSystemSettingSchema } from '../validators/admin.validator';
import type { z } from 'zod';

type RevenueQuery = z.infer<typeof revenueRangeSchema>;
type SettingBody = z.infer<typeof upsertSystemSettingSchema>;

export const adminController = {
  async dashboard(_req: Request, res: Response) {
    const stats = await adminService.getDashboardStats();
    return ok(res, { stats });
  },

  async revenue(req: Request, res: Response) {
    const q = req.query as unknown as RevenueQuery;
    const data = await adminService.getRevenueDashboard(q.rangeDays);
    return ok(res, data);
  },

  async monitoring(_req: Request, res: Response) {
    const data = await adminService.getMonitoring();
    return ok(res, data);
  },

  async reports(_req: Request, res: Response) {
    const data = await adminService.getReports();
    return ok(res, data);
  },

  async listSettings(_req: Request, res: Response) {
    const settings = await adminService.listSystemSettings();
    return ok(res, { settings });
  },

  async getSetting(req: Request, res: Response) {
    const setting = await adminService.getSystemSetting(req.params.key);
    return ok(res, { setting });
  },

  async upsertSetting(req: Request, res: Response) {
    const body = req.body as SettingBody;
    const setting = await adminService.upsertSystemSetting(
      req.params.key,
      body.value as Prisma.InputJsonValue,
      req.user!.id,
    );
    await auditService.record({
      action: AUDIT.SYSTEM_SETTING_UPDATED,
      userId: req.user!.id,
      metadata: { key: req.params.key },
    });
    return ok(res, { setting }, 'Setting updated.');
  },
};
