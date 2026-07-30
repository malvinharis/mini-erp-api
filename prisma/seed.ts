import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = 'admin@mini-erp.local';
  const password = await argon2.hash('changeme123', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Admin', password, role: 'ADMIN' },
  });

  await prisma.example.createMany({
    data: [
      { name: 'First example', status: 'ACTIVE', amount: 1250.5, ownerId: admin.id },
      { name: 'Draft item', status: 'DRAFT', amount: 0, ownerId: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded admin: ${email} / changeme123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
