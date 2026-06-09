/**
 * src/controllers/auth.controller.ts
 * Thin HTTP layer over authService. Handles cookies and HTTP semantics only.
 */
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { getClientContext } from '../utils/requestContext';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookies';
import { ok, created } from '../utils/apiResponse';
import { env } from '../config/env';

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body, getClientContext(req));
    return created(
      res,
      { user },
      'Account created. Check your email to verify your account.',
    );
  },

  async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      getClientContext(req),
    );
    setRefreshCookie(res, refreshToken);
    return ok(res, { user, accessToken }, 'Logged in successfully.');
  },

  async refresh(req: Request, res: Response) {
    const raw = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
    const { user, accessToken, refreshToken } = await authService.refresh(
      raw,
      getClientContext(req),
    );
    setRefreshCookie(res, refreshToken);
    return ok(res, { user, accessToken }, 'Token refreshed.');
  },

  async logout(req: Request, res: Response) {
    const raw = req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(raw, getClientContext(req));
    clearRefreshCookie(res);
    return ok(res, null, 'Logged out successfully.');
  },

  async logoutAll(req: Request, res: Response) {
    await authService.logoutAll(req.user!.id);
    clearRefreshCookie(res);
    return ok(res, null, 'Logged out from all devices.');
  },

  async verifyEmail(req: Request, res: Response) {
    const user = await authService.verifyEmail(req.body.token, getClientContext(req));
    return ok(res, { user }, 'Email verified successfully.');
  },

  async resendVerification(req: Request, res: Response) {
    await authService.resendVerification(req.body.email);
    return ok(res, null, 'If an account exists, a verification email has been sent.');
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email, getClientContext(req));
    return ok(res, null, 'If an account exists, a reset link has been sent.');
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(
      req.body.token,
      req.body.password,
      getClientContext(req),
    );
    clearRefreshCookie(res);
    return ok(res, null, 'Password has been reset. Please log in.');
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      getClientContext(req),
    );
    clearRefreshCookie(res);
    return ok(res, null, 'Password changed. Please log in again.');
  },

  /** Current authenticated user (from access token). */
  async me(req: Request, res: Response) {
    const { userService } = await import('../services/user.service');
    const user = await userService.getById(req.user!.id);
    return ok(res, { user }, 'OK');
  },

  /**
   * Google OAuth callback. Passport populates req.user with our token bundle
   * (see config/passport.ts). We set the refresh cookie and redirect back to
   * the client with the access token in the URL fragment.
   */
  async googleCallback(req: Request, res: Response) {
    // passport strategy attaches the result on req.authResult
    const result = (req as unknown as { authResult: Awaited<ReturnType<typeof authService.loginWithGoogle>> }).authResult;
    setRefreshCookie(res, result.refreshToken);
    const redirectUrl = `${env.CLIENT_URL}/oauth/callback#access_token=${encodeURIComponent(
      result.accessToken,
    )}`;
    return res.redirect(redirectUrl);
  },
};
