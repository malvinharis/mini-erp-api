import { NotFoundException } from '@nestjs/common';
import type { PaginationQuery } from '../../shared';
import { ExampleService } from './example.service';

function makePrisma() {
  return {
    example: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('ExampleService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ExampleService;

  beforeEach(() => {
    prisma = makePrisma();
    // biome-ignore lint/suspicious/noExplicitAny: injecting a structural Prisma mock
    service = new ExampleService(prisma as any);
  });

  it('list returns data + meta', async () => {
    const rows = [{ id: '1', name: 'a' }];
    prisma.$transaction.mockResolvedValue([rows, 1]);

    const res = await service.list('owner-1', { page: 1, limit: 20 } as PaginationQuery);

    expect(res.data).toBe(rows);
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('getById throws NotFound when the row is missing (or not owned)', async () => {
    prisma.example.findFirst.mockResolvedValue(null);
    await expect(service.getById('owner-1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create injects the owner id', async () => {
    prisma.example.create.mockResolvedValue({ id: '1' });

    await service.create('owner-1', { name: 'a', status: 'DRAFT', amount: 0 });

    expect(prisma.example.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: 'owner-1' }) }),
    );
  });
});
