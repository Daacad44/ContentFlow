/**
 * src/routes/user.routes.ts
 * Profile management (self) + admin user management (RBAC), mounted at
 * /api/v1/users.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole, requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { PERMISSIONS } from '../config/permissions';
import {
  updateProfileSchema,
  listUsersSchema,
  userIdParamSchema,
  updateRoleSchema,
  setActiveSchema,
} from '../validators/user.validator';

const router = Router();

// All user routes require authentication.
router.use(authenticate);

// --- Self profile ---------------------------------------------------------
router.get('/me', asyncHandler(userController.getProfile));

router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(userController.updateProfile),
);

// --- Admin ----------------------------------------------------------------
router.get(
  '/',
  requirePermission(PERMISSIONS.USER_LIST),
  validate({ query: listUsersSchema }),
  asyncHandler(userController.listUsers),
);

router.patch(
  '/:id/role',
  requirePermission(PERMISSIONS.USER_UPDATE_ROLE),
  validate({ params: userIdParamSchema, body: updateRoleSchema }),
  asyncHandler(userController.updateRole),
);

router.patch(
  '/:id/active',
  requireMinRole(Role.ADMIN),
  requirePermission(PERMISSIONS.USER_DEACTIVATE),
  validate({ params: userIdParamSchema, body: setActiveSchema }),
  asyncHandler(userController.setActive),
);

export default router;
