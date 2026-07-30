import type { PageMeta, PaginationQuery } from '../../shared';

export interface PrismaPageArgs {
  skip: number;
  take: number;
}

export function toPrismaPage(query: PaginationQuery): PrismaPageArgs {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

export function buildPageMeta(total: number, query: PaginationQuery): PageMeta {
  return {
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}
