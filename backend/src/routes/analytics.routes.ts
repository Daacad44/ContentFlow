import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireWorkspaceMember, requireWorkspacePermission } from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  analyticsDateRangeSchema,
  generateReportSchema,
  reportIdParamSchema,
} from '../validators/analytics.validator';

export const analyticsWorkspaceRoutes = Router({ mergeParams: true });

analyticsWorkspaceRoutes.use(authenticate);
analyticsWorkspaceRoutes.use(validate({ params: workspaceIdParamSchema }));
analyticsWorkspaceRoutes.use(requireWorkspaceMember());
analyticsWorkspaceRoutes.use(requireWorkspacePermission(WORKSPACE_PERMISSIONS.ANALYTICS_READ));

analyticsWorkspaceRoutes.get('/dashboard', asyncHandler(analyticsController.dashboard));
analyticsWorkspaceRoutes.get(
  '/engagement',
  validate({ query: analyticsDateRangeSchema }),
  asyncHandler(analyticsController.engagement),
);
analyticsWorkspaceRoutes.get(
  '/reach',
  validate({ query: analyticsDateRangeSchema }),
  asyncHandler(analyticsController.reach),
);
analyticsWorkspaceRoutes.get(
  '/growth',
  validate({ query: analyticsDateRangeSchema }),
  asyncHandler(analyticsController.growth),
);
analyticsWorkspaceRoutes.get(
  '/performance',
  validate({ query: analyticsDateRangeSchema }),
  asyncHandler(analyticsController.performance),
);
analyticsWorkspaceRoutes.get('/reports', asyncHandler(analyticsController.listReports));
analyticsWorkspaceRoutes.get(
  '/reports/:reportId',
  validate({ params: reportIdParamSchema }),
  asyncHandler(analyticsController.getReport),
);
analyticsWorkspaceRoutes.post(
  '/reports',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.ANALYTICS_REPORT),
  validate({ body: generateReportSchema }),
  asyncHandler(analyticsController.generateReport),
);
