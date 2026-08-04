import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

// Minimal Prisma mock — $transaction supports both the array and callback forms.
function makePrisma() {
  const prisma = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // biome-ignore lint/suspicious/noExplicitAny: test double
    $transaction: jest.fn((arg: any): any => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  };
  return prisma;
}

describe('CustomersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: CustomersService;

  beforeEach(() => {
    prisma = makePrisma();
    // biome-ignore lint/suspicious/noExplicitAny: injecting the mock
    service = new CustomersService(prisma as any);
  });

  it('list returns data + pagination meta', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1', name: 'PT A' }]);
    prisma.customer.count.mockResolvedValue(1);

    const res = await service.list({ page: 1, limit: 20 });

    expect(res.data).toHaveLength(1);
    expect(res.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('getById throws NotFound when missing', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create stamps createdById', async () => {
    prisma.customer.create.mockResolvedValue({ id: 'c1' });
    await service.create('user-1', { name: 'PT A', email: 'a@x.co' });

    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: 'user-1' }) }),
    );
  });

  it('update stamps updatedById', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.customer.update.mockResolvedValue({ id: 'c1' });
    await service.update('user-2', 'c1', { phone: '021' });

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ updatedById: 'user-2' }) }),
    );
  });

  it('remove soft-deletes (sets deletedAt)', async () => {
    prisma.customer.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.customer.update.mockResolvedValue({ id: 'c1' });
    await service.remove('c1');

    const arg = prisma.customer.update.mock.calls[0][0];
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
  });
});
