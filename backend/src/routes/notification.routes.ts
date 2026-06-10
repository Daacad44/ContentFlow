import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireWorkspaceMember, requireWorkspacePermission } from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  listNotificationsSchema,
  notificationIdParamSchema,
  updatePreferencesSchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
  alertRuleIdParamSchema,
} from '../validators/notification.validator';

const router = Router();
router.use(authenticate);

// User notifications (global)
router.get(
  '/',
  validate({ query: listNotificationsSchema }),
  asyncHandler(notificationController.list),
);
router.patch(
  '/:notificationId/read',
  validate({ params: notificationIdParamSchema }),
  asyncHandler(notificationController.markRead),
);
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.get('/preferences', asyncHandler(notificationController.getPreferences));
router.patch(
  '/preferences',
  validate({ body: updatePreferencesSchema }),
  asyncHandler(notificationController.updatePreferences),
);

// Workspace alerts & preferences
export const workspaceNotificationRoutes = Router({ mergeParams: true });
workspaceNotificationRoutes.use(authenticate);
workspaceNotificationRoutes.use(validate({ params: workspaceIdParamSchema }));
workspaceNotificationRoutes.use(requireWorkspaceMember());

workspaceNotificationRoutes.get(
  '/preferences',
  asyncHandler(notificationController.getPreferences),
);
workspaceNotificationRoutes.patch(
  '/preferences',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.NOTIFICATION_MANAGE),
  validate({ body: updatePreferencesSchema }),
  asyncHandler(notificationController.updatePreferences),
);
workspaceNotificationRoutes.get(
  '/alerts',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ALERT_MANAGE),
  asyncHandler(notificationController.listAlerts),
);
workspaceNotificationRoutes.post(
  '/alerts',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ALERT_MANAGE),
  validate({ body: createAlertRuleSchema }),
  asyncHandler(notificationController.createAlert),
);
workspaceNotificationRoutes.patch(
  '/alerts/:ruleId',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ALERT_MANAGE),
  validate({ params: alertRuleIdParamSchema, body: updateAlertRuleSchema }),
  asyncHandler(notificationController.updateAlert),
);
workspaceNotificationRoutes.delete(
  '/alerts/:ruleId',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ALERT_MANAGE),
  validate({ params: alertRuleIdParamSchema }),
  asyncHandler(notificationController.deleteAlert),
);
workspaceNotificationRoutes.post(
  '/alerts/evaluate',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ALERT_MANAGE),
  asyncHandler(notificationController.evaluateAlerts),
);

export default router;
