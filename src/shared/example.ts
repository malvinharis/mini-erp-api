import { z } from 'zod';

/**
 * POLA SCHEMA — copy this file per new domain, rename `example` -> `<domain>`.
 * Single source of truth: backend (createZodDto) and frontend (zodResolver)
 * both consume these schemas.
 */

export const exampleStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type ExampleStatus = z.infer<typeof exampleStatusSchema>;

export const createExampleSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    status: exampleStatusSchema.default('DRAFT'),
    amount: z.coerce.number().nonnegative().default(0),
  })
  .strict();
export type CreateExampleInput = z.infer<typeof createExampleSchema>;

export const updateExampleSchema = createExampleSchema.partial();
export type UpdateExampleInput = z.infer<typeof updateExampleSchema>;

export const exampleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: exampleStatusSchema,
  amount: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Example = z.infer<typeof exampleSchema>;
