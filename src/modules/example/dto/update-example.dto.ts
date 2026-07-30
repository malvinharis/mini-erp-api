import { createZodDto } from 'nestjs-zod';
import { updateExampleSchema } from '../../../shared';

export class UpdateExampleDto extends createZodDto(updateExampleSchema) {}
