import { Router } from 'express';
import { activityLogController } from '../controllers/activityLog.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { requireWorkspaceMember, requireWorkspacePermission } from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { PERMISSIONS } from '../config/permissions';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  listAuditLogsSchema,
  listLoginHistorySchema,
  auditLogIdParamSchema,
} from '../validators/activityLog.validator';

const router = Router();
router.use(authenticate);

// Platform admin — all audit logs
router.get(
  '/audit',
  requirePermission(PERMISSIONS.AUDIT_READ),
  validate({ query: listAuditLogsSchema }),
  asyncHandler(activityLogController.listAuditLogs),
);

router.get(
  '/audit/:logId',
  requirePermission(PERMISSIONS.AUDIT_READ),
  validate({ params: auditLogIdParamSchema }),
  asyncHandler(activityLogController.getAuditLog),
);

router.get(
  '/login-history',
  validate({ query: listLoginHistorySchema }),
  asyncHandler(activityLogController.listLoginHistory),
);

router.get(
  '/security',
  requirePermission(PERMISSIONS.AUDIT_READ),
  validate({ query: listAuditLogsSchema }),
  asyncHandler(activityLogController.listSecurityLogs),
);

router.get(
  '/system',
  requirePermission(PERMISSIONS.AUDIT_READ),
  validate({ query: listAuditLogsSchema }),
  asyncHandler(activityLogController.getSystemHistory),
);

// Workspace-scoped activity logs
export const workspaceActivityRoutes = Router({ mergeParams: true });
workspaceActivityRoutes.use(authenticate);
workspaceActivityRoutes.use(validate({ params: workspaceIdParamSchema }));
workspaceActivityRoutes.use(requireWorkspaceMember());
workspaceActivityRoutes.use(requireWorkspacePermission(WORKSPACE_PERMISSIONS.ACTIVITY_LOG_READ));

workspaceActivityRoutes.get(
  '/audit',
  validate({ query: listAuditLogsSchema }),
  asyncHandler(activityLogController.listAuditLogs),
);

workspaceActivityRoutes.get(
  '/login-history',
  validate({ query: listLoginHistorySchema }),
  asyncHandler(activityLogController.listLoginHistory),
);

workspaceActivityRoutes.get(
  '/security',
  asyncHandler(activityLogController.getSecuritySummary),
);

export default router;
