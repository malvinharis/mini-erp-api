import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

// Optional: same-origin clients send it via httpOnly cookie (empty body);
// cross-origin SPA clients send it in the body. Controller enforces presence.
export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).optional(),
  })
  .strict();
export type RefreshInput = z.infer<typeof refreshSchema>;

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export const userRoleSchema = z.enum(['ADMIN', 'STAFF', 'VIEWER']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;
