import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { buildPageMeta, toPrismaPage } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser, CreateUserInput, PaginationQuery, UpdateUserInput } from '../../shared';

/**
 * Admin-only user management. Argon2id hashing, soft delete via `deletedAt`
 * (deactivate). Explicit `select` never leaks the password hash.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly select = {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  } as const;

  private static readonly hashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  } as const;

  /** Auth-shaped lookup — active users only. */
  async findById(id: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async list(query: PaginationQuery) {
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const { skip, take } = toPrismaPage(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: rows.map(toUserView), meta: buildPageMeta(total, query) };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: this.select });
    if (!user) throw new NotFoundException('User not found');
    return toUserView(user);
  }

  async create(input: CreateUserInput) {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Email already in use');

    const password = await argon2.hash(input.password, UsersService.hashOptions);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, password, role: input.role },
      select: this.select,
    });
    return toUserView(user);
  }

  async update(id: string, input: UpdateUserInput) {
    await this.getById(id); // existence check
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { deletedAt: input.isActive ? null : new Date() } : {}),
      },
      select: this.select,
    });
    return toUserView(user);
  }

  /** Deactivate (soft delete). Never hard-delete users with historical data. */
  async deactivate(id: string): Promise<void> {
    await this.getById(id); // existence check
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/** Maps the soft-delete column to an `isActive` flag for the API surface. */
function toUserView(row: UserRow) {
  const { deletedAt, ...rest } = row;
  return { ...rest, isActive: deletedAt === null };
}
