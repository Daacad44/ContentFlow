import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireWorkspaceMember, requireWorkspacePermission } from '../middleware/workspace.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { WORKSPACE_PERMISSIONS } from '../config/workspacePermissions';
import { workspaceIdParamSchema } from '../validators/workspace.validator';
import { checkoutSchema, listBillingSchema } from '../validators/billing.validator';

const router = Router();

// Public plans list
router.get('/plans', asyncHandler(billingController.listPlans));

// Stripe webhook (no auth — signature verified)
router.post('/webhook', asyncHandler(billingController.webhook));

// Workspace billing
export const workspaceBillingRoutes = Router({ mergeParams: true });
workspaceBillingRoutes.use(authenticate);
workspaceBillingRoutes.use(validate({ params: workspaceIdParamSchema }));
workspaceBillingRoutes.use(requireWorkspaceMember());

workspaceBillingRoutes.get(
  '/subscription',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_READ),
  asyncHandler(billingController.getSubscription),
);
workspaceBillingRoutes.get(
  '/usage',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_READ),
  asyncHandler(billingController.getUsage),
);
workspaceBillingRoutes.get(
  '/invoices',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_READ),
  validate({ query: listBillingSchema }),
  asyncHandler(billingController.listInvoices),
);
workspaceBillingRoutes.get(
  '/payments',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_READ),
  validate({ query: listBillingSchema }),
  asyncHandler(billingController.listPayments),
);
workspaceBillingRoutes.post(
  '/checkout',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_MANAGE),
  validate({ body: checkoutSchema }),
  asyncHandler(billingController.checkout),
);
workspaceBillingRoutes.post(
  '/portal',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_MANAGE),
  asyncHandler(billingController.portal),
);
workspaceBillingRoutes.post(
  '/cancel',
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.BILLING_MANAGE),
  asyncHandler(billingController.cancel),
);

export default router;
