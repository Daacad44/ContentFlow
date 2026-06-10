import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { ok, created } from '../utils/apiResponse';
import type {
  listNotificationsSchema,
  updatePreferencesSchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
} from '../validators/notification.validator';
import type { z } from 'zod';

type ListQuery = z.infer<typeof listNotificationsSchema>;
type PrefsBody = z.infer<typeof updatePreferencesSchema>;
type AlertBody = z.infer<typeof createAlertRuleSchema>;
type UpdateAlertBody = z.infer<typeof updateAlertRuleSchema>;

export const notificationController = {
  async list(req: Request, res: Response) {
    const q = req.query as unknown as ListQuery;
    const result = await notificationService.listForUser(req.user!.id, {
      unreadOnly: q.unreadOnly,
      page: q.page,
      limit: q.limit,
    });
    return ok(res, result);
  },

  async markRead(req: Request, res: Response) {
    await notificationService.markRead(req.user!.id, req.params.notificationId);
    return ok(res, null, 'Marked as read.');
  },

  async markAllRead(req: Request, res: Response) {
    await notificationService.markAllRead(req.user!.id);
    return ok(res, null, 'All notifications marked as read.');
  },

  async getPreferences(req: Request, res: Response) {
    const workspaceId = req.params.workspaceId as string | undefined;
    const preferences = await notificationService.getPreferences(req.user!.id, workspaceId);
    return ok(res, { preferences });
  },

  async updatePreferences(req: Request, res: Response) {
    const body = req.body as PrefsBody;
    const workspaceId = (req.params.workspaceId as string) ?? null;
    const preferences = await notificationService.updatePreferences(
      req.user!.id,
      workspaceId,
      body.preferences,
    );
    return ok(res, { preferences }, 'Preferences updated.');
  },

  async listAlerts(req: Request, res: Response) {
    const rules = await notificationService.listAlertRules(req.params.workspaceId);
    return ok(res, { rules });
  },

  async createAlert(req: Request, res: Response) {
    const body = req.body as AlertBody;
    const rule = await notificationService.createAlertRule(
      req.params.workspaceId,
      req.user!.id,
      body,
    );
    return created(res, { rule }, 'Alert rule created.');
  },

  async updateAlert(req: Request, res: Response) {
    const body = req.body as UpdateAlertBody;
    const rule = await notificationService.updateAlertRule(
      req.params.workspaceId,
      req.params.ruleId,
      body,
    );
    return ok(res, { rule }, 'Alert rule updated.');
  },

  async deleteAlert(req: Request, res: Response) {
    await notificationService.deleteAlertRule(req.params.workspaceId, req.params.ruleId);
    return ok(res, null, 'Alert rule deleted.');
  },

  async evaluateAlerts(req: Request, res: Response) {
    const triggered = await notificationService.evaluateAlerts(req.params.workspaceId);
    return ok(res, { triggered });
  },
};
