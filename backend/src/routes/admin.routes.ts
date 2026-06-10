import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { PERMISSIONS } from '../config/permissions';
import {
  revenueRangeSchema,
  systemSettingKeyParamSchema,
  upsertSystemSettingSchema,
} from '../validators/admin.validator';

const router = Router();
router.use(authenticate);

router.get(
  '/dashboard',
  requirePermission(PERMISSIONS.ADMIN_DASHBOARD),
  asyncHandler(adminController.dashboard),
);

router.get(
  '/revenue',
  requirePermission(PERMISSIONS.REVENUE_READ),
  validate({ query: revenueRangeSchema }),
  asyncHandler(adminController.revenue),
);

router.get(
  '/monitoring',
  requirePermission(PERMISSIONS.ADMIN_MONITORING),
  asyncHandler(adminController.monitoring),
);

router.get(
  '/reports',
  requirePermission(PERMISSIONS.ADMIN_REPORTS),
  asyncHandler(adminController.reports),
);

router.get(
  '/settings',
  requirePermission(PERMISSIONS.ADMIN_SETTINGS),
  asyncHandler(adminController.listSettings),
);

router.get(
  '/settings/:key',
  requirePermission(PERMISSIONS.ADMIN_SETTINGS),
  validate({ params: systemSettingKeyParamSchema }),
  asyncHandler(adminController.getSetting),
);

router.put(
  '/settings/:key',
  requirePermission(PERMISSIONS.ADMIN_SETTINGS),
  validate({ params: systemSettingKeyParamSchema, body: upsertSystemSettingSchema }),
  asyncHandler(adminController.upsertSetting),
);

export default router;
