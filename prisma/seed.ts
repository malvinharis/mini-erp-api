import { PrismaClient, type UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const hash = (plain: string): Promise<string> =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

async function main(): Promise<void> {
  const users: Array<{ email: string; name: string; role: UserRole; password: string }> = [
    { email: 'admin@mini-erp.local', name: 'Admin', role: 'ADMIN', password: 'changeme123' },
    { email: 'staff@mini-erp.local', name: 'Staff', role: 'STAFF', password: 'changeme123' },
    { email: 'viewer@mini-erp.local', name: 'Viewer', role: 'VIEWER', password: 'changeme123' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, role: u.role, password: await hash(u.password) },
    });
    console.log(`Seeded ${u.role.toLowerCase()}: ${u.email} / ${u.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
