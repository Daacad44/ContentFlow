/**
 * src/routes/social.routes.ts
 * Social account routes — workspace-scoped + public OAuth callback.
 */
import { Router } from 'express';
import { socialAccountController } from '../controllers/socialAccount.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import {
  socialAccountIdParamSchema,
  connectPlatformSchema,
  listSelectionSchema,
  completeSelectionSchema,
} from '../validators/social.validator';

const workspaceRouter = Router({ mergeParams: true });
const publicRouter = Router();

// --- Public OAuth callback (no auth — validated via state token) ------------
publicRouter.get('/oauth/callback', asyncHandler(socialAccountController.oauthCallback));

// --- Workspace-scoped routes -----------------------------------------------
workspaceRouter.use(authenticate);

workspaceRouter.get(
  '/',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_READ),
  asyncHandler(socialAccountController.list),
);

workspaceRouter.post(
  '/connect',
  validate({ params: workspaceIdParamSchema, body: connectPlatformSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.SOCIAL_CONNECT),
  asyncHandler(socialAccountController.connect),
);

workspaceRouter.post(
  '/sync',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.SOCIAL_SYNC),
  asyncHandler(socialAccountController.sync),
);

workspaceRouter.post(
  '/selection/list',
  validate({ params: workspaceIdParamSchema, body: listSelectionSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.SOCIAL_CONNECT),
  asyncHandler(socialAccountController.listSelection),
);

workspaceRouter.post(
  '/selection/complete',
  validate({ params: workspaceIdParamSchema, body: completeSelectionSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.SOCIAL_CONNECT),
  asyncHandler(socialAccountController.completeSelection),
);

workspaceRouter.delete(
  '/:accountId',
  validate({ params: socialAccountIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.SOCIAL_DISCONNECT),
  asyncHandler(socialAccountController.disconnect),
);

workspaceRouter.get(
  '/:accountId/health',
  validate({ params: socialAccountIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.POST_READ),
  asyncHandler(socialAccountController.checkHealth),
);

export { workspaceRouter as socialWorkspaceRoutes, publicRouter as socialPublicRoutes };
