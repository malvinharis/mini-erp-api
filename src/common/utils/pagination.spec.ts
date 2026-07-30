import type { PaginationQuery } from '../../shared';
import { buildPageMeta, toPrismaPage } from './pagination';

const q = (page: number, limit: number): PaginationQuery => ({ page, limit });

describe('pagination utils', () => {
  it('toPrismaPage computes skip/take from page and limit', () => {
    expect(toPrismaPage(q(1, 20))).toEqual({ skip: 0, take: 20 });
    expect(toPrismaPage(q(3, 20))).toEqual({ skip: 40, take: 20 });
  });

  it('buildPageMeta computes totalPages', () => {
    expect(buildPageMeta(45, q(2, 20))).toEqual({
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it('totalPages is at least 1 for an empty result set', () => {
    expect(buildPageMeta(0, q(1, 20)).totalPages).toBe(1);
  });
});
