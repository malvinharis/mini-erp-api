import { createZodDto } from 'nestjs-zod';
import { changeInvoiceStatusSchema } from '../../../shared';

export class ChangeInvoiceStatusDto extends createZodDto(changeInvoiceStatusSchema) {}
