import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

jest.mock('argon2');
const verify = argon2.verify as jest.Mock;

function makeDeps() {
  const prisma = { user: { findFirst: jest.fn() } };
  const tokens = { issuePair: jest.fn(), rotate: jest.fn(), revokeAll: jest.fn() };
  return { prisma, tokens };
}

describe('AuthService', () => {
  beforeEach(() => verify.mockReset());

  it('throws on unknown email (still verifies to reduce enumeration)', async () => {
    const { prisma, tokens } = makeDeps();
    prisma.user.findFirst.mockResolvedValue(null);
    verify.mockResolvedValue(false);

    // biome-ignore lint/suspicious/noExplicitAny: injecting mocks
    const service = new AuthService(prisma as any, tokens as any);
    await expect(
      service.login({ email: 'no@x.co', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).toHaveBeenCalled();
  });

  it('throws on wrong password', async () => {
    const { prisma, tokens } = makeDeps();
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@x.co',
      name: 'A',
      role: 'STAFF',
      password: '$argon2id$hash',
    });
    verify.mockResolvedValue(false);

    // biome-ignore lint/suspicious/noExplicitAny: injecting mocks
    const service = new AuthService(prisma as any, tokens as any);
    await expect(service.login({ email: 'a@x.co', password: 'wrong123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('issues a token pair on valid credentials', async () => {
    const { prisma, tokens } = makeDeps();
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@x.co',
      name: 'A',
      role: 'STAFF',
      password: '$argon2id$hash',
    });
    verify.mockResolvedValue(true);
    tokens.issuePair.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

    // biome-ignore lint/suspicious/noExplicitAny: injecting mocks
    const service = new AuthService(prisma as any, tokens as any);
    const res = await service.login({ email: 'a@x.co', password: 'password123' });

    expect(res).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(tokens.issuePair).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', role: 'STAFF' }),
    );
  });
});
