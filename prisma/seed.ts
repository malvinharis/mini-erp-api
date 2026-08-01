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

  await seedCustomers(55);
}

/** Generate enough customers to exercise pagination (default limit 20). Idempotent. */
async function seedCustomers(count: number): Promise<void> {
  const prefixes = ['PT', 'CV', 'UD', 'PT', 'CV'];
  const words = [
    'Maju',
    'Sentosa',
    'Abadi',
    'Jaya',
    'Makmur',
    'Sejahtera',
    'Mandiri',
    'Bersama',
    'Nusantara',
    'Cahaya',
    'Sinar',
    'Karya',
    'Bumi',
    'Sukses',
    'Prima',
    'Utama',
  ];

  for (let i = 1; i <= count; i++) {
    const name = `${prefixes[i % prefixes.length]} ${words[i % words.length]} ${words[(i * 3) % words.length]}`;
    const slug = `customer${String(i).padStart(3, '0')}`;
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    await prisma.customer.upsert({
      // email isn't unique in the schema, so key idempotency on a deterministic id
      where: { id },
      update: {},
      create: {
        id,
        name,
        email: `finance@${slug}.co.id`,
        phone: `021-555-${String(1000 + i)}`,
        npwp: i % 3 === 0 ? null : `0${i}.234.567.8-90${i % 10}.000`,
        address: `Jl. Contoh No. ${i}, Jakarta`,
      },
    });
  }
  console.log(`Seeded ${count} customers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
