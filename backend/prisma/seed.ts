/**
 * prisma/seed.ts
 * Seeds an initial SUPER_ADMIN account so the system is usable out of the box.
 * Run with: npm run db:seed
 */
import { PrismaClient, Role, AuthProvider } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@contentflow.ai';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Platform Admin',
      role: Role.SUPER_ADMIN,
      provider: AuthProvider.LOCAL,
      emailVerified: true,
      isActive: true,
      profileComplete: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded super admin: ${admin.email} (password: ${password})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
