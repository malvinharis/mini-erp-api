import { createZodDto } from 'nestjs-zod';
import { createCustomerSchema } from '../../../shared';

export class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
