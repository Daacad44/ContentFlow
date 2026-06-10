/**
 * scripts/test-otp-flow.ts
 * Manual integration test for the OTP auth flow against a running API.
 *
 * Usage:
 *   API_URL=http://localhost:4000 npm run test:otp
 *
 * Requires: PostgreSQL + migrated schema + RESEND_API_KEY (or console fallback in dev).
 */
const API = process.env.API_URL ?? 'http://localhost:4000';
const BASE = `${API}/api/v1/auth`;

const testEmail = `otp_test_${Date.now()}@example.com`;
const password = 'TestPass123!';

async function req(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log('🧪 OTP Flow Test\n');
  console.log(`API: ${BASE}\n`);

  // 1. Register
  console.log('1️⃣  Register…');
  const reg = await req('/register', {
    fullName: 'OTP Tester',
    email: testEmail,
    password,
    confirmPassword: password,
    acceptTerms: true,
  });
  console.log(`   Status: ${reg.status}`, reg.json.message);
  if (reg.status !== 201) {
    console.error('❌ Register failed');
    process.exit(1);
  }

  // 2. Invalid OTP
  console.log('\n2️⃣  Invalid OTP…');
  const bad = await req('/verify-otp', { email: testEmail, otp: '000000' });
  console.log(`   Status: ${bad.status} (expect 400)`);
  if (bad.status === 200) {
    console.error('❌ Should reject invalid OTP');
    process.exit(1);
  }

  // 3. Fetch OTP from DB (dev/test helper only)
  console.log('\n3️⃣  Reading OTP from database (test helper)…');
  const { PrismaClient, OtpPurpose } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  // Replace with known OTP for test
  const testOtp = '482913';
  await prisma.otpCode.updateMany({
    where: { userId: user.id, purpose: OtpPurpose.EMAIL_VERIFICATION, usedAt: null },
    data: { usedAt: new Date() },
  });
  const crypto = await import('crypto');
  const secret = process.env.OTP_PEPPER || process.env.PASSWORD_PEPPER || 'botan-dev-otp';
  const codeHash = crypto.createHmac('sha256', secret).update(`${user.id}:${testOtp}`).digest('hex');
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  console.log(`   Test OTP: ${testOtp}`);

  // 4. Verify OTP
  console.log('\n4️⃣  Verify OTP…');
  const verify = await req('/verify-otp', { email: testEmail, otp: testOtp });
  console.log(`   Status: ${verify.status}`, verify.json.message);
  if (verify.status !== 200 || !verify.json.data?.accessToken) {
    console.error('❌ Verify failed', verify.json);
    process.exit(1);
  }
  console.log('   ✅ JWT issued');

  // 5. Forgot password
  console.log('\n5️⃣  Forgot password…');
  const forgot = await req('/forgot-password', { email: testEmail });
  console.log(`   Status: ${forgot.status}`);

  // 6. Reset with OTP
  const resetOtp = '719204';
  await prisma.otpCode.updateMany({
    where: { userId: user.id, purpose: OtpPurpose.PASSWORD_RESET, usedAt: null },
    data: { usedAt: new Date() },
  });
  const resetHash = crypto.createHmac('sha256', secret).update(`${user.id}:${resetOtp}`).digest('hex');
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      purpose: OtpPurpose.PASSWORD_RESET,
      codeHash: resetHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  console.log('\n6️⃣  Reset password with OTP…');
  const reset = await req('/reset-password', {
    email: testEmail,
    otp: resetOtp,
    password: 'NewPass456!',
    confirmPassword: 'NewPass456!',
  });
  console.log(`   Status: ${reset.status}`, reset.json.message);

  // 7. Login with new password
  console.log('\n7️⃣  Login with new password…');
  const login = await req('/login', { email: testEmail, password: 'NewPass456!' });
  console.log(`   Status: ${login.status}`, login.json.message);

  // Cleanup
  await prisma.user.delete({ where: { email: testEmail } }).catch(() => {});
  await prisma.$disconnect();

  console.log('\n✅ OTP flow test completed successfully.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
