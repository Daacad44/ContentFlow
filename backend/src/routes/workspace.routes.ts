/**
 * src/routes/workspace.routes.ts
 * Workspace, member, and invitation routes mounted at /api/v1/workspaces.
 */
import { Router } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { workspaceController } from '../controllers/workspace.controller';
import { memberController } from '../controllers/member.controller';
import { invitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  requireWorkspaceMember,
  requireWorkspacePermission,
  requireWorkspaceRole,
} from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { socialWorkspaceRoutes } from './social.routes';
import { postWorkspaceRoutes } from './post.routes';
import {
  workspaceIdParamSchema,
  memberIdParamSchema,
  invitationIdParamSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
} from '../validators/workspace.validator';

const router = Router();

router.use(authenticate);

// --- Workspace CRUD -------------------------------------------------------
router.get('/', asyncHandler(workspaceController.list));

router.post(
  '/',
  validate({ body: createWorkspaceSchema }),
  asyncHandler(workspaceController.create),
);

router.get(
  '/:workspaceId',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  asyncHandler(workspaceController.get),
);

router.patch(
  '/:workspaceId',
  validate({ params: workspaceIdParamSchema, body: updateWorkspaceSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE),
  asyncHandler(workspaceController.update),
);

router.delete(
  '/:workspaceId',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.WORKSPACE_DELETE),
  asyncHandler(workspaceController.remove),
);

router.get(
  '/:workspaceId/permissions',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  asyncHandler(workspaceController.getPermissions),
);

// --- Members --------------------------------------------------------------
router.get(
  '/:workspaceId/members',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.MEMBER_LIST),
  asyncHandler(memberController.list),
);

router.patch(
  '/:workspaceId/members/:memberId/role',
  validate({ params: memberIdParamSchema, body: updateMemberRoleSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.MEMBER_UPDATE_ROLE),
  asyncHandler(memberController.updateRole),
);

router.delete(
  '/:workspaceId/members/:memberId',
  validate({ params: memberIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
  asyncHandler(memberController.remove),
);

router.post(
  '/:workspaceId/members/leave',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  asyncHandler(memberController.leave),
);

router.post(
  '/:workspaceId/members/transfer-ownership',
  validate({ params: workspaceIdParamSchema, body: transferOwnershipSchema }),
  requireWorkspaceMember(),
  requireWorkspaceRole(WorkspaceRole.OWNER),
  asyncHandler(memberController.transferOwnership),
);

// --- Invitations ----------------------------------------------------------
router.get(
  '/:workspaceId/invitations',
  validate({ params: workspaceIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.INVITATION_LIST),
  asyncHandler(invitationController.list),
);

router.post(
  '/:workspaceId/invitations',
  validate({ params: workspaceIdParamSchema, body: inviteMemberSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.MEMBER_INVITE),
  asyncHandler(invitationController.create),
);

router.delete(
  '/:workspaceId/invitations/:invitationId',
  validate({ params: invitationIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.INVITATION_REVOKE),
  asyncHandler(invitationController.revoke),
);

router.post(
  '/:workspaceId/invitations/:invitationId/resend',
  validate({ params: invitationIdParamSchema }),
  requireWorkspaceMember(),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.MEMBER_INVITE),
  asyncHandler(invitationController.resend),
);

// --- Social accounts --------------------------------------------------------
router.use('/:workspaceId/social', socialWorkspaceRoutes);

// --- Posts (scheduler) ------------------------------------------------------
router.use('/:workspaceId/posts', postWorkspaceRoutes);

export default router;
