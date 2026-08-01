# mini-erp-api

Backend for a Mini ERP Invoicing system — **NestJS · Prisma · PostgreSQL**. Modular monolith with strict module boundaries (thin controllers, thick services), JWT auth with refresh-token rotation, and role-based access control.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | NestJS 10 |
| ORM / DB | Prisma 6 · PostgreSQL 16 |
| Validation | zod + `nestjs-zod` (single schema → DTO + Swagger) |
| Auth | `@nestjs/jwt` + `passport-jwt`, argon2id hashing |
| Security | helmet, CORS allowlist, `@nestjs/throttler`, pino redaction |
| Docs | Swagger (OpenAPI) at `/docs` |
| Health | `@nestjs/terminus` |
| Tooling | Biome (lint + format), Husky + commitlint, tsx |

## Prerequisites

- Node.js **>= 22**
- pnpm **10**
- PostgreSQL 16 (or Docker)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d db          # start Postgres
pnpm install
pnpm prisma:deploy               # apply migrations
pnpm seed                        # seed demo users
pnpm dev                         # http://localhost:4000
```

Run the whole stack (db + api) in containers:

```bash
docker compose up --build
```

## Local run (host Postgres)

```bash
cp .env.example .env             # point DATABASE_URL at your Postgres
pnpm install
pnpm prisma:generate
pnpm prisma:deploy
pnpm seed
pnpm dev
```

## Environment

Validated by zod at boot — the app fails to start if any variable is missing or malformed. See `.env.example`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | Pooled Postgres connection (runtime) |
| `DIRECT_URL` | Direct connection for `migrate deploy` (set when using a pooler) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets (min 32 chars) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes in seconds |
| `CORS_ORIGINS` | Comma-separated origin allowlist |

## Scripts

| Command | Action |
|---|---|
| `pnpm dev` | Start with watch |
| `pnpm build` / `pnpm start` | Build then run `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm test` | Jest |
| `pnpm prisma:migrate` | Create + apply a dev migration |
| `pnpm prisma:deploy` | Apply pending migrations |
| `pnpm seed` | Seed demo users |

## API

- Base path: `/api`
- Swagger UI: `http://localhost:4000/docs`

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | Email + password → token pair (httpOnly cookie) |
| `POST` | `/api/auth/refresh` | public | Rotate refresh token, issue new access token |
| `POST` | `/api/auth/logout` | auth | Revoke refresh token, clear cookie |
| `GET` | `/api/users/me` | auth | Current authenticated user |
| `GET` | `/api/users` | ADMIN | List users (paginated, search by name/email) |
| `GET` | `/api/users/:id` | ADMIN | User detail |
| `POST` | `/api/users` | ADMIN | Create user |
| `PATCH` | `/api/users/:id` | ADMIN | Update name / role / active state |
| `DELETE` | `/api/users/:id` | ADMIN | Deactivate (soft delete) |
| `GET` | `/api/health` | public | DB health check |

## RBAC

Roles: **ADMIN**, **STAFF**, **VIEWER**.

Two enforced layers:

1. **Role-level** — `RolesGuard` + `@Roles('ADMIN')` decorator gate the endpoint.
2. **Object-level** — ownership/tenant predicates live in the service `where` clause, not just role checks. Domain modules must include the ownership predicate on every query.

User management (`/api/users`) is ADMIN-only. Authentication is global (`JwtAuthGuard`); mark public routes with `@Public()`.

## Demo accounts

Created by `pnpm seed`:

| Email | Password | Role |
|---|---|---|
| `admin@mini-erp.local` | `changeme123` | ADMIN |
| `staff@mini-erp.local` | `changeme123` | STAFF |
| `viewer@mini-erp.local` | `changeme123` | VIEWER |

## Data model

`User` and `RefreshToken`. Conventions: UUID primary keys, `createdAt` / `updatedAt` on every model, soft delete via `deletedAt`, `Decimal(14,2)` for money, indexes on foreign keys / filter / sort columns. Domain models (Customer, Invoice, InvoiceItem) are added per the project scope.

## Security

- Passwords hashed with argon2id (memoryCost 19456, timeCost 2).
- Access tokens short-lived (15 min); refresh tokens rotated on every use with reuse-detection that revokes the whole token family; hash stored in DB.
- Tokens delivered via `httpOnly` + `Secure` + `SameSite=Lax` cookies — never `localStorage`.
- Rate limiting on auth endpoints, helmet security headers, explicit CORS allowlist, and pino logging with token/password redaction.

## Project layout

```
src/
├── common/        decorators, guards, filters, interceptors, dto, utils
├── config/        env schema (zod) + config module
├── prisma/        global PrismaModule + service
├── shared/        zod schemas (auth, user, common) — shared with the frontend
├── modules/
│   ├── auth/      login, refresh rotation, jwt strategy, token service
│   ├── users/     admin CRUD + /me
│   └── health/    terminus DB check
└── main.ts        helmet, CORS, Swagger, ZodValidationPipe
```
