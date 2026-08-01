import { z } from 'zod';
import { userRoleSchema } from './auth';

/**
 * Users domain — admin-managed accounts. Single source of truth: backend
 * (createZodDto) and frontend (zodResolver) both consume these schemas.
 */

export const createUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(128),
    role: userRoleSchema.default('STAFF'),
  })
  .strict();
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Admin edits name / role / active flag. Email and password are not editable here. */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;
