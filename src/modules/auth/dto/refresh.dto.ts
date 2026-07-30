import { createZodDto } from 'nestjs-zod';
import { refreshSchema } from '../../../shared';

export class RefreshDto extends createZodDto(refreshSchema) {}
