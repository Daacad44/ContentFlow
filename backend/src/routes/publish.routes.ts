/**
 * src/routes/publish.routes.ts
 * Publishing engine — job logs, retry, queue status.
 */
import { Router } from 'express';
import { publishController } from '../controllers/publish.controller';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  listPublishJobsQuerySchema,
  publishJobIdParamSchema,
} from '../validators/publish.validator';

const router = Router({ mergeParams: true });

router.get(
  '/status',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.PUBLISH_LOGS_READ),
  asyncHandler(publishController.queueStatus),
);

router.get(
  '/jobs',
  validate({ params: workspaceIdParamSchema, query: listPublishJobsQuerySchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.PUBLISH_LOGS_READ),
  asyncHandler(publishController.listJobs),
);

router.get(
  '/jobs/:jobId',
  validate({ params: publishJobIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.PUBLISH_LOGS_READ),
  asyncHandler(publishController.getJob),
);

router.get(
  '/jobs/:jobId/logs',
  validate({ params: publishJobIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.PUBLISH_LOGS_READ),
  asyncHandler(publishController.getLogs),
);

router.post(
  '/jobs/:jobId/retry',
  validate({ params: publishJobIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.PUBLISH_RETRY),
  asyncHandler(publishController.retryJob),
);

export { router as publishWorkspaceRoutes };
