import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPageMeta, toPrismaPage } from '../../common/utils/pagination';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCustomerInput, PaginationQuery, UpdateCustomerInput } from '../../shared';

/**
 * Org-wide customers — every query filters `deletedAt: null` (soft delete).
 * Explicit `select`, single query for list + count, no N+1.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly select = {
    id: true,
    name: true,
    email: true,
    phone: true,
    npwp: true,
    address: true,
    createdAt: true,
    updatedAt: true,
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
  } as const;

  async list(query: PaginationQuery) {
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const { skip, take } = toPrismaPage(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data: rows, meta: buildPageMeta(total, query) };
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: this.select,
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(createdById: string, input: CreateCustomerInput) {
    return this.prisma.customer.create({
      data: { ...input, createdById },
      select: this.select,
    });
  }

  async update(updatedById: string, id: string, input: UpdateCustomerInput) {
    await this.getById(id); // existence + not-deleted check
    return this.prisma.customer.update({
      where: { id },
      data: { ...input, updatedById },
      select: this.select,
    });
  }

  /** Soft delete — keeps the row for invoices that reference it. */
  async remove(id: string): Promise<void> {
    await this.getById(id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
