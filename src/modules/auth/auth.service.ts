import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser, LoginInput, TokenPair } from '../../shared';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(input: LoginInput): Promise<TokenPair> {
    // override model-level omit to read the hash for verification only
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      omit: { password: false },
    });
    // constant-ish: verify even on missing user to reduce enumeration signal
    const hash =
      user?.password ??
      '$argon2id$v=19$m=19456,t=2,p=1$invalidsaltvalue$0000000000000000000000000000000000000000000';
    const ok = await argon2.verify(hash, input.password).catch(() => false);
    if (!user || !ok) throw new UnauthorizedException('Invalid credentials');

    return this.tokens.issuePair(this.toAuthUser(user));
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(userId: string): Promise<void> {
    await this.tokens.revokeAll(userId);
  }

  private toAuthUser(u: {
    id: string;
    email: string;
    name: string;
    role: AuthUser['role'];
  }): AuthUser {
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }
}
