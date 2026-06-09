/**
 * src/routes/invitation.routes.ts
 * Public/authenticated invitation accept routes mounted at /api/v1/invitations.
 */
import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  invitationTokenParamSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
} from '../validators/workspace.validator';

const router = Router();

router.get(
  '/:token',
  validate({ params: invitationTokenParamSchema }),
  asyncHandler(invitationController.preview),
);

router.post(
  '/accept',
  authenticate,
  validate({ body: acceptInvitationSchema }),
  asyncHandler(invitationController.accept),
);

router.post(
  '/decline',
  validate({ body: declineInvitationSchema }),
  asyncHandler(invitationController.decline),
);

export default router;
