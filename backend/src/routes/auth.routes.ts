/**
 * src/routes/auth.routes.ts
 * Authentication endpoints, mounted at /api/v1/auth and /api/auth.
 */
import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  authLimiter,
  sensitiveLimiter,
  otpVerifyLimiter,
  otpResendLimiter,
} from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordOtpSchema,
  verifyOtpSchema,
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

// --- OTP email verification -----------------------------------------------
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validate({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp),
);

router.post(
  '/resend-verification',
  otpResendLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification),
);

/** @deprecated Legacy link verification — prefer POST /verify-otp */
router.post(
  '/verify-email',
  otpVerifyLimiter,
  validate({ body: verifyEmailSchema }),
  asyncHandler(authController.verifyEmail),
);

// --- Password reset (OTP) -------------------------------------------------
router.post(
  '/forgot-password',
  sensitiveLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);

router.post(
  '/reset-password',
  otpVerifyLimiter,
  validate({ body: resetPasswordOtpSchema }),
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
