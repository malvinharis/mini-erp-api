import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { ConfigService } from '@nestjs/config';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Env } from '../../config/env.schema';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser, TokenPair } from '../../shared';

/**
 * Issues access + refresh tokens.
 *
 * Refresh token format is `<rowId>.<secret>`: the rowId (indexed PK) locates the
 * stored record in O(1), and only the argon2 hash of the secret is persisted.
 * Tokens are rotated on every use; presenting an already-rotated token revokes
 * the whole family (theft detection).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  async issuePair(user: AuthUser, family: string = randomUUID()): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    const secret = randomUUID() + randomUUID();
    const ttl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    const row = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        family,
        tokenHash: await argon2.hash(secret),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
      select: { id: true },
    });

    return { accessToken, refreshToken: `${row.id}.${secret}` };
  }

  /** Verify a presented refresh token, rotate it, return a fresh pair. */
  async rotate(presented: string): Promise<TokenPair> {
    const [rowId, secret] = presented.split('.');
    if (!rowId || !secret) throw new UnauthorizedException('Invalid refresh token');

    const row = await this.prisma.refreshToken.findUnique({
      where: { id: rowId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, deletedAt: true } },
      },
    });

    if (!row || row.expiresAt < new Date() || row.user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // already rotated → reuse attempt → burn the family
    if (row.revokedAt) {
      await this.revokeFamily(row.family);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const ok = await argon2.verify(row.tokenHash, secret).catch(() => false);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const user: AuthUser = {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
    };
    return this.issuePair(user, row.family);
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
