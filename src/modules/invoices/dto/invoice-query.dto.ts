import { createZodDto } from 'nestjs-zod';
import { invoiceQuerySchema } from '../../../shared';

export class InvoiceQueryDto extends createZodDto(invoiceQuerySchema) {}
