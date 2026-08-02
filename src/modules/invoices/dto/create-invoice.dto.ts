import { createZodDto } from 'nestjs-zod';
import { createInvoiceSchema } from '../../../shared';

export class CreateInvoiceDto extends createZodDto(createInvoiceSchema) {}
