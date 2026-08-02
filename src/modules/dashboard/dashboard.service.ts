import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// biome-ignore lint/style/useImportType: NestJS DI needs a runtime import for emitDecoratorMetadata
import { PrismaService } from '../../prisma/prisma.service';
import type { DashboardSummary, InvoiceStatus } from '../../shared';

const ALL_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const MONTHS_BACK = 6;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** One aggregated payload — groupBy + count + a single monthly rollup, no N+1. */
  async summary(): Promise<DashboardSummary> {
    const monthFrom = startOfMonthsAgo(MONTHS_BACK - 1);

    const [grouped, customerCount, recent, monthly] = await this.prisma.$transaction([
      this.prisma.invoice.groupBy({
        by: ['status'],
        _sum: { total: true },
        _count: true,
        orderBy: { status: 'asc' },
      }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.invoice.findMany({
        select: {
          id: true,
          number: true,
          status: true,
          issueDate: true,
          total: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>(Prisma.sql`
        SELECT date_trunc('month', "issueDate") AS month, SUM("total") AS total
        FROM "Invoice"
        WHERE "status" = 'PAID' AND "issueDate" >= ${monthFrom}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
    ]);

    const sumByStatus = new Map(
      grouped.map((g) => [g.status, g._sum?.total ?? new Prisma.Decimal(0)]),
    );
    const countByStatus = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, grouped.find((g) => g.status === s)?._count ?? 0]),
    ) as Record<InvoiceStatus, number>;

    const outstanding = (sumByStatus.get('SENT') ?? new Prisma.Decimal(0)).plus(
      sumByStatus.get('OVERDUE') ?? new Prisma.Decimal(0),
    );

    return {
      revenuePaid: (sumByStatus.get('PAID') ?? new Prisma.Decimal(0)).toFixed(2),
      outstanding: outstanding.toFixed(2),
      overdueCount: countByStatus.OVERDUE,
      customerCount,
      countByStatus,
      revenueByMonth: monthly.map((m) => ({
        month: m.month.toISOString().slice(0, 7), // YYYY-MM
        total: new Prisma.Decimal(m.total).toFixed(2),
      })),
      recentInvoices: recent.map((r) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        issueDate: r.issueDate.toISOString(),
        total: r.total.toFixed(2),
        customer: r.customer,
      })),
    };
  }
}

/** First day (UTC) of the month `n` months before the current month. */
function startOfMonthsAgo(n: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
}
