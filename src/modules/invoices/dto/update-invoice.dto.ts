import { createZodDto } from 'nestjs-zod';
import { updateInvoiceSchema } from '../../../shared';

export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema) {}
