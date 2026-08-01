import { createZodDto } from 'nestjs-zod';
import { updateCustomerSchema } from '../../../shared';

export class UpdateCustomerDto extends createZodDto(updateCustomerSchema) {}
