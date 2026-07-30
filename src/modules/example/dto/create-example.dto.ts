import { createZodDto } from 'nestjs-zod';
import { createExampleSchema } from '../../../shared';

export class CreateExampleDto extends createZodDto(createExampleSchema) {}
