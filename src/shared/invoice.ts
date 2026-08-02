import { z } from 'zod';
import { paginationQuerySchema } from './common';

/** Full lifecycle status. Only DRAFT/SENT are selectable at create time. */
export const invoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceItemInputSchema = z
  .object({
    description: z.string().trim().min(1).max(200),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
  })
  .strict();
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const createInvoiceSchema = z
  .object({
    customerId: z.string().uuid(),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    // percent, e.g. 11 for PPN 11%. 0 = no tax.
    taxRate: z.coerce.number().min(0).max(100).default(0),
    items: z.array(invoiceItemInputSchema).min(1).max(100),
    // create as a draft, or send immediately
    status: z.enum(['DRAFT', 'SENT']).default('DRAFT'),
  })
  .strict();
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** Edit is only allowed while DRAFT; a full replace of the editable fields. */
export const updateInvoiceSchema = createInvoiceSchema.omit({ status: true }).partial();
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/** Status transition target. Validity is enforced server-side by the state machine. */
export const changeInvoiceStatusSchema = z
  .object({ status: z.enum(['SENT', 'PAID', 'CANCELLED']) })
  .strict();
export type ChangeInvoiceStatusInput = z.infer<typeof changeInvoiceStatusSchema>;

/** List filters — status, customer, date range — plus pagination. */
export const invoiceQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;
