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
import { ApiError } from '../utils/apiError';
import { decodeOAuthState, encodeOAuthState, parseRedirectTarget, decodeOAuthCallbackFromState, resolveGoogleCallbackUrl } from '../utils/oauthRedirect';
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
  router.get('/google', authLimiter, (req, res, next) => {
    const redirectOrigin = parseRedirectTarget(req.query.redirect);
    const callbackUrl = resolveGoogleCallbackUrl(req);
    const state = encodeOAuthState(redirectOrigin, callbackUrl);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state,
      callbackURL: callbackUrl,
    })(req, res, next);
  });

  router.get(
    '/google/callback',
    (req, res, next) => {
      const clientUrl = decodeOAuthState(req.query.state);
      const callbackUrl = decodeOAuthCallbackFromState(req.query.state, req);
      passport.authenticate(
        'google',
        { session: false, callbackURL: callbackUrl },
        (err, user) => {
          if (err) {
            const code = err instanceof ApiError ? err.code : 'oauth_failed';
            return res.redirect(`${clientUrl}/login?error=${encodeURIComponent(code)}`);
          }
          if (!user) {
            return res.redirect(`${clientUrl}/login?error=oauth_failed`);
          }
          return authController.googleCallback(req, res).catch(next);
        },
      )(req, res, next);
    },
  );
}

export default router;
