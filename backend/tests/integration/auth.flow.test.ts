/**
 * tests/integration/auth.flow.test.ts
 * End-to-end HTTP tests for the auth flow using supertest. These require a
 * running PostgreSQL test database (DATABASE_URL) with migrations applied:
 *
 *   createdb contentflow_test
 *   DATABASE_URL=... npx prisma migrate deploy
 *   npm test
 *
 * The suite is skipped automatically when RUN_DB_TESTS !== 'true' so unit tests
 * can run in CI without a database.
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';

const runDbTests = process.env.RUN_DB_TESTS === 'true';
const d = runDbTests ? describe : describe.skip;

const app = createApp();

const testUser = {
  fullName: 'Jane Tester',
  email: `jane_${Date.now()}@example.com`,
  password: 'Sup3rSecret!1',
  confirmPassword: 'Sup3rSecret!1',
  acceptTerms: true,
};

d('Auth flow (integration)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, email: 'weak@example.com', password: 'weak', confirmPassword: 'weak' });
    expect(res.status).toBe(400);
  });

  it('blocks login before email verification', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(403);
  });

  it('logs in after manual email verification', async () => {
    await prisma.user.update({
      where: { email: testUser.email },
      data: { emailVerified: true },
    });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects access to /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
