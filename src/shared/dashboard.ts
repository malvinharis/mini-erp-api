import { z } from 'zod';
import { invoiceStatusSchema } from './invoice';

/**
 * Dashboard summary — one aggregated payload for the landing page cards, the
 * count-per-status widget, the revenue-per-month chart, and recent invoices.
 * Money values are Decimal on the backend, so they arrive as strings.
 */
export const dashboardSummarySchema = z.object({
  revenuePaid: z.string(), // sum of PAID invoice totals
  outstanding: z.string(), // sum of SENT + OVERDUE totals
  overdueCount: z.number().int(),
  customerCount: z.number().int(),
  countByStatus: z.record(invoiceStatusSchema, z.number().int()),
  revenueByMonth: z.array(z.object({ month: z.string(), total: z.string() })),
  recentInvoices: z.array(
    z.object({
      id: z.string().uuid(),
      number: z.string(),
      status: invoiceStatusSchema,
      issueDate: z.string().datetime(),
      total: z.string(),
      customer: z.object({ id: z.string().uuid(), name: z.string() }),
    }),
  ),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
