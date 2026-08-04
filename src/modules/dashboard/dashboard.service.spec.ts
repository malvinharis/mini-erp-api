import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';

function makePrisma() {
  return {
    invoice: { groupBy: jest.fn(), findMany: jest.fn() },
    customer: { count: jest.fn() },
    $queryRaw: jest.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test double
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };
}

describe('DashboardService', () => {
  it('aggregates revenue, outstanding, counts and recent invoices', async () => {
    const prisma = makePrisma();
    prisma.invoice.groupBy.mockResolvedValue([
      { status: 'PAID', _sum: { total: new Prisma.Decimal('1000') }, _count: 3 },
      { status: 'SENT', _sum: { total: new Prisma.Decimal('400') }, _count: 2 },
      { status: 'OVERDUE', _sum: { total: new Prisma.Decimal('100') }, _count: 1 },
    ]);
    prisma.customer.count.mockResolvedValue(42);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv1',
        number: 'INV-2026-0001',
        status: 'PAID',
        issueDate: new Date('2026-07-10'),
        total: new Prisma.Decimal('1000'),
        customer: { id: 'c1', name: 'PT A' },
      },
    ]);
    prisma.$queryRaw.mockResolvedValue([
      { month: new Date('2026-07-01'), total: new Prisma.Decimal('1000') },
    ]);

    // biome-ignore lint/suspicious/noExplicitAny: injecting the mock
    const service = new DashboardService(prisma as any);
    const res = await service.summary();

    expect(res.revenuePaid).toBe('1000.00');
    expect(res.outstanding).toBe('500.00'); // SENT + OVERDUE
    expect(res.overdueCount).toBe(1);
    expect(res.customerCount).toBe(42);
    expect(res.countByStatus).toMatchObject({
      PAID: 3,
      SENT: 2,
      OVERDUE: 1,
      DRAFT: 0,
      CANCELLED: 0,
    });
    expect(res.revenueByMonth).toEqual([{ month: '2026-07', total: '1000.00' }]);
    expect(res.recentInvoices[0]).toMatchObject({ number: 'INV-2026-0001', total: '1000.00' });
  });
});
