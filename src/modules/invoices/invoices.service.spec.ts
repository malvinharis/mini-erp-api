import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../shared';
import { InvoicesService } from './invoices.service';

const ADMIN: AuthUser = { id: 'admin', email: 'a@x.co', name: 'Admin', role: 'ADMIN' };
const STAFF: AuthUser = { id: 'staff', email: 's@x.co', name: 'Staff', role: 'STAFF' };

// A detail-shaped invoice as Prisma would return it (before serialization).
function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    number: 'INV-2026-0001',
    status: 'DRAFT',
    taxRate: '0',
    items: [],
    statusLogs: [],
    customer: { id: 'c1', name: 'PT A', email: 'a@x.co', address: null },
    ...overrides,
  };
}

function makePrisma() {
  const prisma = {
    invoice: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoiceItem: { deleteMany: jest.fn() },
    invoiceStatusLog: { create: jest.fn() },
    customer: { findFirst: jest.fn() },
    // biome-ignore lint/suspicious/noExplicitAny: test double
    $transaction: jest.fn((arg: any): any => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  };
  return prisma;
}

describe('InvoicesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: InvoicesService;

  beforeEach(() => {
    prisma = makePrisma();
    // biome-ignore lint/suspicious/noExplicitAny: injecting the mock
    service = new InvoicesService(prisma as any);
  });

  it('create computes money server-side and generates the number', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.invoice.create.mockResolvedValue(detail({ status: 'SENT' }));

    await service.create(ADMIN, {
      customerId: 'c1',
      issueDate: new Date('2026-08-01'),
      dueDate: new Date('2026-08-15'),
      taxRate: 11,
      status: 'SENT',
      items: [
        { description: 'Jasa', quantity: 10, unitPrice: 300000 },
        { description: 'Lisensi', quantity: 1, unitPrice: 1500000 },
      ],
    });

    const data = prisma.invoice.create.mock.calls[0][0].data;
    expect(data.number).toBe('INV-2026-0001');
    expect(data.subtotal).toBe('4500000.00');
    expect(data.taxAmount).toBe('495000.00');
    expect(data.total).toBe('4995000.00');
    expect(data.createdById).toBe('admin');
  });

  it('rejects create for an unknown customer', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(
      service.create(ADMIN, {
        customerId: 'nope',
        issueDate: new Date(),
        dueDate: new Date(),
        taxRate: 0,
        status: 'DRAFT',
        items: [{ description: 'x', quantity: 1, unitPrice: 100 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update is blocked once the invoice leaves DRAFT', async () => {
    prisma.invoice.findUnique.mockResolvedValue(detail({ status: 'SENT' }));
    await expect(service.update(ADMIN, 'inv1', { taxRate: 11 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid status transition', async () => {
    prisma.invoice.findUnique.mockResolvedValue(detail({ status: 'PAID' }));
    await expect(service.changeStatus(ADMIN, 'inv1', 'SENT')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('only ADMIN can cancel', async () => {
    prisma.invoice.findUnique.mockResolvedValue(detail({ status: 'SENT' }));
    await expect(service.changeStatus(STAFF, 'inv1', 'CANCELLED')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a valid transition and logs it', async () => {
    prisma.invoice.findUnique.mockResolvedValue(detail({ status: 'SENT' }));
    prisma.invoice.update.mockResolvedValue(detail({ status: 'PAID' }));

    await service.changeStatus(ADMIN, 'inv1', 'PAID');

    expect(prisma.invoiceStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromStatus: 'SENT',
          toStatus: 'PAID',
          changedById: 'admin',
        }),
      }),
    );
  });
});
