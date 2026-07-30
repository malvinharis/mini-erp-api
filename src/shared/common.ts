import { z } from 'zod';

/** Standard pagination query — shared by every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Response envelope — success. */
export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta | null;
}

/** Response envelope — error. */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
}
