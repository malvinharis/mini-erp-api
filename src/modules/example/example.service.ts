import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPageMeta, toPrismaPage } from '../../common/utils/pagination';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateExampleInput, PaginationQuery, UpdateExampleInput } from '../../shared';

/**
 * Every query carries the ownership predicate (ownerId + deletedAt) — object-level
 * authorization lives here, not only in the role guard. Explicit `select`, no N+1.
 */
@Injectable()
export class ExampleService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly listSelect = {
    id: true,
    name: true,
    status: true,
    amount: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async list(ownerId: string, query: PaginationQuery) {
    const where = {
      ownerId,
      deletedAt: null,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };
    const { skip, take } = toPrismaPage(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.example.findMany({
        where,
        select: this.listSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.example.count({ where }),
    ]);

    return { data: rows, meta: buildPageMeta(total, query) };
  }

  async getById(ownerId: string, id: string) {
    const row = await this.prisma.example.findFirst({
      where: { id, ownerId, deletedAt: null },
      select: this.listSelect,
    });
    if (!row) throw new NotFoundException('Example not found');
    return row;
  }

  async create(ownerId: string, input: CreateExampleInput) {
    return this.prisma.example.create({
      data: { ...input, ownerId },
      select: this.listSelect,
    });
  }

  async update(ownerId: string, id: string, input: UpdateExampleInput) {
    await this.getById(ownerId, id); // ownership check
    return this.prisma.example.update({
      where: { id },
      data: input,
      select: this.listSelect,
    });
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.getById(ownerId, id); // ownership check
    await this.prisma.example.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
