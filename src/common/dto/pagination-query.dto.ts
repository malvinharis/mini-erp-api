import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '../../shared';

/** Reusable list query DTO — validated + documented in Swagger. */
export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
