/**
 * src/config/env.ts
 * Loads and validates environment variables at boot. The app refuses to start
 * with an invalid configuration (fail-fast), which prevents subtle security
 * misconfigurations in production.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanString = z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .pipe(z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().default('ContentFlow'),
  API_URL: z.string().url().default('http://localhost:4000'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

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

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: booleanString.default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('ContentFlow <no-reply@contentflow.ai>'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PASSWORD_PEPPER: z.string().optional().default(''),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  ZERNIO_API_KEY: z.string().optional().default(''),
  ZERNIO_API_URL: z.string().url().default('https://zernio.com/api/v1'),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),
});

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
  smtpEnabled: Boolean(data.SMTP_HOST && data.SMTP_USER),
  zernioEnabled: Boolean(data.ZERNIO_API_KEY),
  MAX_UPLOAD_SIZE_BYTES: data.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
};

export type Env = typeof env;
