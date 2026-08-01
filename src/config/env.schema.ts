import { z } from 'zod';

/** App fails to boot if env is incomplete — not at first request. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  // Microservice topology — each feature service listens on its own port; the
  // gateway reverse-proxies to them. Defaults let a fresh clone run as-is.
  GATEWAY_PORT: z.coerce.number().int().positive().default(4000),
  AUTH_SERVICE_PORT: z.coerce.number().int().positive().default(4001),
  USERS_SERVICE_PORT: z.coerce.number().int().positive().default(4002),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:4001'),
  USERS_SERVICE_URL: z.string().url().default('http://localhost:4002'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
