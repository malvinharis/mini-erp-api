import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildPageMeta, toPrismaPage } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CreateInvoiceInput,
  InvoiceQuery,
  InvoiceStatus,
  UpdateInvoiceInput,
} from '../../shared';

/** Valid status transitions. Anything not listed is rejected. */
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // List row matches the web `invoiceListItemSchema` (customer incl. email).
  private readonly listSelect = {
    id: true,
    number: true,
    status: true,
    issueDate: true,
    dueDate: true,
    total: true,
    createdAt: true,
    customer: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
  } satisfies Prisma.InvoiceSelect;

  private readonly detailInclude = {
    customer: { select: { id: true, name: true, email: true, address: true } },
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
    items: {
      select: { id: true, description: true, quantity: true, unitPrice: true, amount: true },
    },
    statusLogs: {
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        createdAt: true,
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    },
  } satisfies Prisma.InvoiceInclude;

  async list(query: InvoiceQuery) {
    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.from || query.to
        ? {
            issueDate: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const { skip, take } = toPrismaPage(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        select: this.listSelect,
        orderBy: { issueDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data: rows, meta: buildPageMeta(total, query) };
  }

  async getById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.detailInclude,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return serializeInvoice(invoice);
  }

  async create(user: AuthUser, input: CreateInvoiceInput) {
    await this.assertCustomer(input.customerId);
    const totals = computeTotals(input.items, input.taxRate);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx, input.issueDate);
      return tx.invoice.create({
        data: {
          number,
          customerId: input.customerId,
          createdById: user.id,
          status: input.status,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          subtotal: totals.subtotal,
          taxRate: input.taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: { create: totals.items },
          statusLogs: { create: { toStatus: input.status, changedById: user.id } },
        },
        include: this.detailInclude,
      });
    });
    return serializeInvoice(invoice);
  }

  async update(user: AuthUser, id: string, input: UpdateInvoiceInput) {
    const existing = await this.getById(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be edited');
    }
    if (input.customerId) await this.assertCustomer(input.customerId);

    const items = input.items ?? existing.items.map(toItemInput);
    const taxRate = input.taxRate ?? Number(existing.taxRate);
    const totals = computeTotals(items, taxRate);

    const invoice = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      return tx.invoice.update({
        where: { id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.issueDate ? { issueDate: input.issueDate } : {}),
          ...(input.dueDate ? { dueDate: input.dueDate } : {}),
          taxRate,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          updatedById: user.id,
          items: { create: totals.items },
        },
        include: this.detailInclude,
      });
    });
    return serializeInvoice(invoice);
  }

  async changeStatus(user: AuthUser, id: string, to: InvoiceStatus) {
    const invoice = await this.getById(id);
    const allowed = TRANSITIONS[invoice.status];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot change status from ${invoice.status} to ${to}`);
    }
    // Cancelling an invoice is an ADMIN-only action.
    if (to === 'CANCELLED' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only an admin can cancel an invoice');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceStatusLog.create({
        data: { invoiceId: id, fromStatus: invoice.status, toStatus: to, changedById: user.id },
      });
      return tx.invoice.update({
        where: { id },
        data: { status: to, updatedById: user.id },
        include: this.detailInclude,
      });
    });
    return serializeInvoice(updated);
  }

  private async assertCustomer(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Customer not found');
  }
}

type DetailInvoice = Prisma.InvoiceGetPayload<{
  include: {
    customer: { select: { id: true; name: true; email: true; address: true } };
    createdBy: { select: { id: true; name: true } };
    updatedBy: { select: { id: true; name: true } };
    items: {
      select: { id: true; description: true; quantity: true; unitPrice: true; amount: true };
    };
    statusLogs: {
      select: {
        id: true;
        fromStatus: true;
        toStatus: true;
        createdAt: true;
        changedBy: { select: { id: true; name: true } };
      };
    };
  };
}>;

/** Flatten status logs to the web contract: `changedAt` + `changedByName`. */
function serializeInvoice(invoice: DetailInvoice) {
  const { statusLogs, ...rest } = invoice;
  return {
    ...rest,
    statusLogs: statusLogs.map((log) => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      changedAt: log.createdAt,
      changedByName: log.changedBy?.name ?? null,
    })),
  };
}

type ItemInput = { description: string; quantity: number; unitPrice: number };

function toItemInput(row: {
  description: string;
  quantity: number;
  unitPrice: unknown;
}): ItemInput {
  return { description: row.description, quantity: row.quantity, unitPrice: Number(row.unitPrice) };
}

/** Money math in integer cents to avoid float drift; returns 2-dp decimal strings. */
function computeTotals(items: ItemInput[], taxRate: number) {
  const priced = items.map((it) => {
    const amountCents = it.quantity * Math.round(it.unitPrice * 100);
    return {
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toFixed(2),
      amount: (amountCents / 100).toFixed(2),
      amountCents,
    };
  });
  const subtotalCents = priced.reduce((sum, it) => sum + it.amountCents, 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  const totalCents = subtotalCents + taxCents;

  return {
    items: priced.map(({ amountCents: _drop, ...rest }) => rest),
    subtotal: (subtotalCents / 100).toFixed(2),
    taxAmount: (taxCents / 100).toFixed(2),
    total: (totalCents / 100).toFixed(2),
  };
}

/** INV-<year>-<4-digit sequence>, sequence scoped to the invoice's year. */
async function nextInvoiceNumber(tx: Prisma.TransactionClient, date: Date): Promise<string> {
  const year = date.getFullYear();
  const prefix = `INV-${year}-`;
  const count = await tx.invoice.count({ where: { number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}
