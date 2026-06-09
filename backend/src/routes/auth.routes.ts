/**
 * src/routes/auth.routes.ts
 * Authentication endpoints, mounted at /api/v1/auth.
 */
import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// --- Public auth ----------------------------------------------------------
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

router.post('/refresh', authLimiter, asyncHandler(authController.refresh));

router.post('/logout', asyncHandler(authController.logout));

// --- Email verification ---------------------------------------------------
router.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  asyncHandler(authController.verifyEmail),
);

router.post(
  '/resend-verification',
  sensitiveLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification),
);

// --- Password reset -------------------------------------------------------
router.post(
  '/forgot-password',
  sensitiveLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);

router.post(
  '/reset-password',
  sensitiveLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

// --- Authenticated --------------------------------------------------------
router.get('/me', authenticate, asyncHandler(authController.me));

router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);

// --- Google OAuth ---------------------------------------------------------
if (env.googleOAuthEnabled) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=oauth_failed`,
    }),
    asyncHandler(authController.googleCallback),
  );
}

export default router;
