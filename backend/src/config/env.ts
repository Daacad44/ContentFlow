/**
 * src/config/env.ts
 * Loads and validates environment variables at boot. The app refuses to start
 * with an invalid configuration (fail-fast), which prevents subtle security
 * misconfigurations in production.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Prisma's schema declares `directUrl`; outside Supabase the direct URL is the same database.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const booleanString = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().default('ContentFlow'),
  API_URL: z.string().url().default('http://localhost:4000'),
  /** Publicly reachable API URL for media (Zernio must fetch images). Falls back to API_URL. */
  PUBLIC_API_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Direct (non-pooled) connection used by Prisma migrations. Defaults to DATABASE_URL. */
  DIRECT_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be >= 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be >= 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('cf_refresh_token'),
  JWT_ISSUER: z.string().default('contentflow.api'),
  JWT_AUDIENCE: z.string().default('contentflow.client'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default('http://localhost:4000/api/v1/auth/google/callback'),

  /** Resend API key — preferred email provider (https://resend.com) */
  RESEND_API_KEY: z.string().optional().default(''),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: booleanString.default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('BotanDev <noreply@botandev.com>'),
  EMAIL_BRAND_NAME: z.string().default('BotanDev'),

  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_PEPPER: z.string().optional().default(''),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  /** Override refresh cookie SameSite: lax | strict | none (auto-detects cross-origin) */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  PASSWORD_PEPPER: z.string().optional().default(''),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  ZERNIO_API_KEY: z.string().optional().default(''),
  ZERNIO_API_URL: z.string().url().default('https://zernio.com/api/v1'),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  // Where post media is stored: "supabase" or "cloudinary" (durable, for production),
  // "local" (server disk, dev only), or "auto" (Supabase, then Cloudinary, else local).
  MEDIA_STORAGE: z.enum(['auto', 'local', 'cloudinary', 'supabase']).default('auto'),

  // Supabase Storage (post media)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('post-media'),

  /** Shared secret for scheduled-job endpoints (Vercel Cron / Supabase pg_cron). */
  CRON_SECRET: z.string().optional().default(''),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),
  /** Limit for browser-to-Supabase direct uploads (videos). Supabase Free caps files at 50MB. */
  MAX_DIRECT_UPLOAD_MB: z.coerce.number().int().positive().default(50),

  // Redis / BullMQ (Agent 05)
  REDIS_URL: z.string().optional().default(''),
  BULLMQ_PREFIX: z.string().default('contentflow'),
  PUBLISH_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  PUBLISH_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  ENABLE_IN_PROCESS_SCHEDULER: booleanString.default('true'),
  /** Dev-only: allow fake publishes when ZERNIO_API_KEY is unset */
  ALLOW_SIMULATED_PUBLISH: booleanString.default('false'),
  /** Production must use Redis/BullMQ for scheduled publishing */
  REQUIRE_REDIS_IN_PRODUCTION: booleanString.default('true'),
  /** Poll interval (ms) when waiting for Zernio platform confirmation */
  PUBLISH_CONFIRM_POLL_MS: z.coerce.number().int().positive().default(5000),
  PUBLISH_CONFIRM_MAX_ATTEMPTS: z.coerce.number().int().positive().default(12),

  // Gemini AI (Agent 06)
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),

  // Cloudinary (Agent 07)
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  // Stripe (Agent 10)
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  // Stripe Price IDs for paid plans (price_...). Without them, plans cannot be purchased.
  STRIPE_PRICE_PRO: z.string().optional().default(''),
  STRIPE_PRICE_BUSINESS: z.string().optional().default(''),
  // Block actions that exceed the workspace's plan (posts, AI, creative assets, team size).
  // Usage is always tracked; turn this on once paid plans can be purchased.
  ENFORCE_PLAN_LIMITS: booleanString.default('false'),
});

type MediaStorageSetting = 'auto' | 'local' | 'cloudinary' | 'supabase';
export type MediaStorageDriver = 'local' | 'cloudinary' | 'supabase';

/** Resolves the effective media storage driver from MEDIA_STORAGE and which providers are configured. */
export function resolveMediaStorage(
  setting: MediaStorageSetting,
  configured: { supabase: boolean; cloudinary: boolean },
): MediaStorageDriver {
  if (setting === 'local') return 'local';
  if (setting === 'supabase' || setting === 'cloudinary') {
    if (!configured[setting]) {
      const vars =
        setting === 'supabase'
          ? 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
          : 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET';
      // eslint-disable-next-line no-console
      console.error(`❌ MEDIA_STORAGE=${setting} requires ${vars}.`);
      process.exit(1);
    }
    return setting;
  }
  if (configured.supabase) return 'supabase';
  if (configured.cloudinary) return 'cloudinary';
  return 'local';
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment configuration:\n',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProd: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  isDev: data.NODE_ENV === 'development',
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  googleOAuthEnabled: Boolean(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET),
  googleCallbackUrl:
    data.GOOGLE_CALLBACK_URL.trim() ||
    `${data.API_URL.replace(/\/$/, '')}/api/v1/auth/google/callback`,
  resendEnabled: Boolean(data.RESEND_API_KEY),
  smtpEnabled: Boolean(data.SMTP_HOST && data.SMTP_USER),
  emailEnabled: Boolean(data.RESEND_API_KEY || (data.SMTP_HOST && data.SMTP_USER)),
  zernioEnabled: Boolean(data.ZERNIO_API_KEY),
  redisEnabled: Boolean(data.REDIS_URL),
  geminiEnabled: Boolean(data.GEMINI_API_KEY),
  cloudinaryEnabled: Boolean(
    data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
  ),
  stripeEnabled: Boolean(data.STRIPE_SECRET_KEY),
  supabaseStorageEnabled: Boolean(data.SUPABASE_URL && data.SUPABASE_SERVICE_ROLE_KEY),
  mediaStorage: resolveMediaStorage(data.MEDIA_STORAGE, {
    supabase: Boolean(data.SUPABASE_URL && data.SUPABASE_SERVICE_ROLE_KEY),
    cloudinary: Boolean(
      data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET,
    ),
  }),
  cronEnabled: Boolean(data.CRON_SECRET),
  /** True when running as a Vercel serverless function. */
  isServerless: Boolean(process.env.VERCEL),
  MAX_UPLOAD_SIZE_BYTES: data.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  MAX_DIRECT_UPLOAD_BYTES: data.MAX_DIRECT_UPLOAD_MB * 1024 * 1024,
  publicApiUrl: data.PUBLIC_API_URL ?? data.API_URL,
  allowSimulatedPublish: data.ALLOW_SIMULATED_PUBLISH && data.NODE_ENV === 'development',
  requireRedisInProduction:
    data.REQUIRE_REDIS_IN_PRODUCTION && data.NODE_ENV === 'production',
};

export type Env = typeof env;
