import { type InvoiceStatus, PrismaClient, type UserRole } from '@prisma/client';
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
  // ~2 invoices per customer so every customer detail page has data
  await seedInvoices(110);
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

/**
 * Seed invoices across every status for list filters + the dashboard. Numbers use
 * a 9xxx range so they never collide with app-generated INV-<year>-000x numbers.
 * Idempotent: keyed on a deterministic id, nested rows created only on insert.
 */
async function seedInvoices(count: number): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@mini-erp.local' } });
  if (!admin) throw new Error('admin user must be seeded before invoices');

  const statuses: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
  const catalog = [
    { description: 'Jasa konsultasi', unitPrice: 300000 },
    { description: 'Lisensi bulanan', unitPrice: 1500000 },
    { description: 'Biaya implementasi', unitPrice: 750000 },
    { description: 'Dukungan teknis', unitPrice: 500000 },
  ];

  for (let i = 1; i <= count; i++) {
    const id = `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    const customerId = `00000000-0000-4000-8000-${String((i % 55) + 1).padStart(12, '0')}`;
    const status = statuses[i % statuses.length];
    const taxRate = i % 2 === 0 ? 11 : 0;

    // 1–2 line items, deterministic per i
    const rawItems = [
      { ...catalog[i % catalog.length], quantity: (i % 5) + 1 },
      ...(i % 3 === 0 ? [{ ...catalog[(i + 1) % catalog.length], quantity: 1 }] : []),
    ];
    const totals = computeTotals(rawItems, taxRate);
    const issueDate = new Date(2026, 6, ((i * 3) % 28) + 1); // spread across Jul 2026
    const dueDate = new Date(issueDate.getTime() + 14 * 86_400_000);

    await prisma.invoice.upsert({
      where: { id },
      update: {},
      create: {
        id,
        number: `INV-2026-${String(9000 + i)}`,
        customerId,
        createdById: admin.id,
        status,
        issueDate,
        dueDate,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        items: { create: totals.items },
        statusLogs: { create: { toStatus: status, changedById: admin.id } },
      },
    });
  }
  console.log(`Seeded ${count} invoices`);
}

/** Money math in integer cents; mirrors InvoicesService.computeTotals. */
function computeTotals(
  items: Array<{ description: string; quantity: number; unitPrice: number }>,
  taxRate: number,
) {
  const priced = items.map((it) => {
    const amountCents = it.quantity * Math.round(it.unitPrice * 100);
    return {
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toFixed(2),
      amount: (amountCents / 100).toFixed(2),
      amountCents,
    };
  });
  const subtotalCents = priced.reduce((sum, it) => sum + it.amountCents, 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  return {
    items: priced.map(({ amountCents: _drop, ...rest }) => rest),
    subtotal: (subtotalCents / 100).toFixed(2),
    taxAmount: (taxCents / 100).toFixed(2),
    total: ((subtotalCents + taxCents) / 100).toFixed(2),
  };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
