import { z } from 'zod';

/**
 * Customers domain — org-wide records (shared across staff, not per-user owned).
 * Single source of truth: backend (createZodDto) and frontend (zodResolver).
 */

export const createCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    email: z.string().email(),
    phone: z.string().trim().max(30).optional(),
    npwp: z.string().trim().max(30).optional(),
    address: z.string().trim().max(255).optional(),
  })
  .strict();
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  npwp: z.string().nullable(),
  address: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Customer = z.infer<typeof customerSchema>;
