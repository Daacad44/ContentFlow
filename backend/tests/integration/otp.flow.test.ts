/**
 * tests/integration/otp.flow.test.ts
 * HTTP tests for OTP registration, verification, and password reset.
 * Run with: RUN_DB_TESTS=true npm test -- tests/integration/otp.flow.test.ts
 */
import crypto from 'crypto';
import request from 'supertest';
import { OtpPurpose } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const d = runDbTests ? describe : describe.skip;

const app = createApp();

function hashTestOtp(userId: string, code: string): string {
  const secret = env.OTP_PEPPER || env.PASSWORD_PEPPER || 'botan-dev-otp';
  return crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

const testUser = {
  fullName: 'OTP Jest User',
  email: `otp_jest_${Date.now()}@example.com`,
  password: 'Sup3rSecret!1',
  confirmPassword: 'Sup3rSecret!1',
  acceptTerms: true as const,
};

d('OTP auth flow (integration)', () => {
  let userId = '';

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('registers and sends OTP (account inactive)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.data.user.emailVerified).toBe(false);

    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    expect(user).toBeTruthy();
    expect(user!.isActive).toBe(false);
    userId = user!.id;
  });

  it('rejects invalid OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp: '000000' });
    expect(res.status).toBe(400);
  });

  it('verifies OTP and returns JWT', async () => {
    const otp = '563821';
    await prisma.otpCode.create({
      data: {
        userId,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        codeHash: hashTestOtp(userId, otp),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testUser.email, otp });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user!.emailVerified).toBe(true);
    expect(user!.isActive).toBe(true);
  });

  it('rejects expired OTP', async () => {
    const otp = '111222';
    await prisma.otpCode.create({
      data: {
        userId,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        codeHash: hashTestOtp(userId, otp),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp });
    expect(res.status).toBe(400);
  });

  it('resets password with OTP', async () => {
    const otp = '884477';
    await prisma.otpCode.create({
      data: {
        userId,
        purpose: OtpPurpose.PASSWORD_RESET,
        codeHash: hashTestOtp(userId, otp),
        expiresAt: new Date(Date.now() + 600_000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: testUser.email,
        otp,
        password: 'NewSecure99!',
        confirmPassword: 'NewSecure99!',
      });
    expect(res.status).toBe(200);
  });
});
