/**
 * src/config/passport.ts
 * Configures the Google OAuth 2.0 strategy. We run stateless (session: false):
 * Passport only verifies the Google profile, then we mint our OWN JWT + refresh
 * token via authService and stash the result on the request for the controller.
 */
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Request } from 'express';
import { env } from './env';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export function configurePassport(): void {
  if (!env.googleOAuthEnabled) {
    logger.warn('Google OAuth is disabled (missing GOOGLE_CLIENT_ID/SECRET).');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (
        req: Request,
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (err: unknown, user?: Express.User | false) => void,
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false);
          }

          const result = await authService.loginWithGoogle(
            {
              googleId: profile.id,
              email,
              fullName: profile.displayName || email.split('@')[0],
              avatarUrl: profile.photos?.[0]?.value,
            },
            { ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined },
          );

          // Stash the token bundle for the callback controller.
          (req as unknown as { authResult: typeof result }).authResult = result;
          return done(null, { id: result.user.id } as Express.User);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}
