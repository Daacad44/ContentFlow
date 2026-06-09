/**
 * src/app.ts
 * Builds and configures the Express application (no network binding here, so it
 * can be imported directly by tests via supertest).
 */
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './utils/logger';
import { configurePassport } from './config/passport';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';
import { mediaRoutes } from './routes/media.routes';

export function createApp(): Application {
  const app = express();

  // Trust the first proxy (needed for correct req.ip behind load balancers).
  app.set('trust proxy', 1);

  // --- Security headers ---------------------------------------------------
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // --- CORS (credentials enabled for the refresh cookie) ------------------
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser clients (no origin) and whitelisted origins.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );

  // --- Body parsing & hardening -------------------------------------------
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());
  app.use(hpp());

  // --- Request logging ----------------------------------------------------
  if (!env.isTest) {
    app.use(pinoHttp({ logger }));
  }

  // --- Passport (stateless) -----------------------------------------------
  configurePassport();
  app.use(passport.initialize());

  // --- Global rate limit + routes -----------------------------------------
  app.use('/api', apiLimiter);
  app.use('/api/v1/media', mediaRoutes);
  app.use('/api/v1', routes);

  // --- 404 + error handling ----------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
