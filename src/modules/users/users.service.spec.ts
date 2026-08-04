import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function makePrisma() {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // biome-ignore lint/suspicious/noExplicitAny: test double
    $transaction: jest.fn((arg: any): any => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  };
  return prisma;
}

describe('UsersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: UsersService;

  beforeEach(() => {
    prisma = makePrisma();
    // biome-ignore lint/suspicious/noExplicitAny: injecting the mock
    service = new UsersService(prisma as any);
  });

  it('findById throws NotFound when missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.findById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list maps deletedAt to isActive and returns meta', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@x.co', name: 'A', role: 'STAFF', deletedAt: null },
    ]);
    prisma.user.count.mockResolvedValue(1);

    const res = await service.list({ page: 1, limit: 20 });

    expect(res.data[0]).toMatchObject({ id: 'u1', isActive: true });
    expect(res.meta.total).toBe(1);
  });

  it('create rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ email: 'dup@x.co', name: 'D', password: 'password123', role: 'STAFF' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create hashes password (never stores plaintext)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', deletedAt: null });

    await service.create({ email: 'n@x.co', name: 'N', password: 'password123', role: 'STAFF' });

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.password).not.toBe('password123');
    expect(data.password).toMatch(/^\$argon2/);
  });

  it('deactivate soft-deletes', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', deletedAt: null });
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    await service.deactivate('u1');

    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
  });
});
