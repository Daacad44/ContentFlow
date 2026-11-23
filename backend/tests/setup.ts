/**
 * tests/setup.ts
 * Sets safe default environment variables for the test runtime so config
 * validation passes without a real .env file. Use a dedicated test database.
 */
import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_value_1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_value_1234567890';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/contentflow_test?schema=public';
process.env.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS =
  process.env.CORS_ORIGINS ??
  'http://localhost:5173,http://localhost:3000,https://content-flow-black.vercel.app';
