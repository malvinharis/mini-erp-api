# mini-erp-api

Backend for the **Mini ERP Invoicing** system — **NestJS · Prisma · PostgreSQL**. A modular monolith with strict module boundaries (thin controllers, thick services), JWT auth with refresh-token rotation, and role-based access control. Ships an optional split into gateway/auth/users microservices behind the same code.

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 22 |
| Framework | NestJS 10 (Express 5) |
| ORM / DB | Prisma 6 · PostgreSQL 16 |
| Validation | zod + `nestjs-zod` (one schema → DTO + Swagger) |
| Auth | `@nestjs/jwt` + `passport-jwt`, argon2id hashing |
| Security | helmet, CORS allowlist, `@nestjs/throttler`, pino redaction |
| Docs | Swagger / OpenAPI at `/docs` |
| Health | `@nestjs/terminus` |
| Tooling | pnpm 10, Biome (lint + format), Husky + commitlint, tsx |

---

## Prerequisites

- **Node.js ≥ 22**
- **pnpm 10** (`corepack enable`)
- **PostgreSQL 16** — or Docker to run it

---

## Installation

```bash
pnpm install
cp .env.example .env      # then fill in secrets (see Environment)
```

Generate the Prisma client and prepare the database:

```bash
pnpm prisma:generate
pnpm prisma:deploy        # apply migrations
pnpm seed                 # seed demo users
```

---

## Running locally

### Option A — host Postgres

```bash
# ensure DATABASE_URL in .env points at your Postgres
pnpm dev                  # http://localhost:4000  (watch mode)
```

### Option B — Docker (Postgres only)

```bash
docker compose up -d db   # Postgres 16 on :5432
pnpm prisma:deploy && pnpm seed
pnpm dev
```

### Option C — full stack in Docker (db + api)

```bash
docker compose up --build # api on :4000, db on :5432
```

### Microservices mode (optional)

The same code can run split behind a gateway:

```bash
pnpm dev:services         # gateway :4000 → auth :4001, users :4002
```

Once running:

- API base: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`
- Health: `http://localhost:4000/api/health`

---

## Environment

Validated by zod at boot — the app **fails to start** if any variable is missing or malformed. See `.env.example`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `PORT` | HTTP port (default 4000) |
| `DATABASE_URL` | Pooled Postgres connection string (runtime) |
| `DIRECT_URL` | Direct connection for `migrate deploy` (pooler can't hold the migration lock) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets (min 32 chars) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes in seconds (900 / 604800) |
| `CORS_ORIGINS` | Comma-separated origin allowlist |
| `GATEWAY_PORT` / `AUTH_SERVICE_PORT` / `USERS_SERVICE_PORT` | Ports for split-services mode |
| `AUTH_SERVICE_URL` / `USERS_SERVICE_URL` | Upstreams the gateway proxies to |

---

## Scripts

| Command | Action |
|---|---|
| `pnpm dev` | Start monolith in watch mode |
| `pnpm dev:services` | Start gateway + auth + users concurrently |
| `pnpm build` / `pnpm start` | Build then run `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | Biome check / autofix |
| `pnpm test` | Jest unit tests (per-service, mocked Prisma) |
| `pnpm prisma:migrate` | Create + apply a dev migration |
| `pnpm prisma:deploy` | Apply pending migrations |
| `pnpm seed` | Seed / reset demo users |

---

## API

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
| `GET` | `/api/customers` | auth | List (paginated, search name/email) |
| `GET` | `/api/customers/:id` | auth | Customer detail |
| `POST` | `/api/customers` | ADMIN·STAFF | Create (records `createdBy`) |
| `PATCH` | `/api/customers/:id` | ADMIN·STAFF | Update (records `updatedBy`) |
| `DELETE` | `/api/customers/:id` | ADMIN·STAFF | Soft delete |
| `GET` | `/api/invoices` | auth | List — filter status/customer/date range, paginated |
| `GET` | `/api/invoices/:id` | auth | Detail — line items + status timeline |
| `POST` | `/api/invoices` | ADMIN·STAFF | Create as DRAFT or SENT (server-computed totals) |
| `PATCH` | `/api/invoices/:id` | ADMIN·STAFF | Edit (DRAFT only) |
| `PATCH` | `/api/invoices/:id/status` | ADMIN·STAFF | Status transition (cancel = ADMIN) |
| `GET` | `/api/dashboard/summary` | auth | Aggregated cards, status counts, revenue-by-month, recent invoices |
| `GET` | `/api/health` | public | DB health check |

### Demo accounts (`pnpm seed`)

| Email | Password | Role |
|---|---|---|
| `admin@mini-erp.local` | `changeme123` | ADMIN |
| `staff@mini-erp.local` | `changeme123` | STAFF |
| `viewer@mini-erp.local` | `changeme123` | VIEWER |

`seed` is idempotent and **resets** name/role/password and reactivates these accounts on every run — re-run it if a demo login drifts.

---

## Architectural decisions & assumptions

- **Modular monolith, split-ready** — modules never import each other's services directly, so moving a module out to its own process (`pnpm dev:services`) changes transport, not business logic.
- **zod as the single source of truth** — schemas in `src/shared/` drive backend DTOs (via `nestjs-zod`), Swagger docs, and the frontend forms. Add a field once; both sides follow.
- **Two enforced authorization layers** — `RolesGuard` gates endpoints by role; every service query also carries an ownership/tenant predicate in its `where` clause (object-level), never relying on hard-to-guess IDs alone.
- **Stateless auth** — no server session. State lives in short-lived access JWTs (15 min) and a rotated refresh-token table, so instances scale horizontally without sticky sessions.
- **Refresh-token rotation with reuse detection** — tokens rotate on every use; presenting an already-used token burns the whole family (theft signal). Only the argon2 hash is stored.
- **Soft delete** — users and customers are deactivated via `deletedAt`, never hard-deleted; invoices retire via the `CANCELLED` status. Preserves audit trails and foreign keys.
- **Audit trail** — customers and invoices record `createdBy` on create and `updatedBy` on update/status-change; every invoice status transition is written to `InvoiceStatusLog` (from → to, actor, time).
- **Server-computed money** — invoice `subtotal` / `taxAmount` / `total` are recomputed on the backend in integer cents from the line items; client-supplied totals are never trusted.
- **Assumptions**: single Postgres instance for dev; secrets in `.env` (validated at boot); money stored as `Decimal(14,2)`, never float; pagination mandatory on all list endpoints.

---

## Testing

Unit tests with **Jest** (`ts-jest`), one spec per service, `PrismaService` mocked — no database needed. Run:

```bash
pnpm test
```

| Suite | Covers |
|---|---|
| `auth.service` | unknown email / wrong password → 401, valid credentials → token pair |
| `users.service` | not-found, `isActive` mapping, duplicate-email conflict, password hashing, soft delete |
| `customers.service` | list + meta, not-found, `createdBy` / `updatedBy` stamping, soft delete |
| `invoices.service` | server-computed totals, auto number, DRAFT-only edit, status state machine, cancel = ADMIN |
| `dashboard.service` | revenue / outstanding / status counts / revenue-by-month aggregation |
| `common/utils/pagination` | pagination helpers |

---

## Security

- argon2id password hashing (memoryCost 19456, timeCost 2).
- Tokens delivered via `httpOnly` + `Secure` + `SameSite=Lax` cookies — never `localStorage`.
- Rate limiting on auth endpoints (5 logins / 60s), helmet headers, explicit CORS allowlist.
- pino logging with `authorization` / `password` / `refreshToken` / `cookie` redaction.
- Prisma parameterizes all queries; `$queryRawUnsafe` is banned.

---

## Project layout

```
src/
├── common/        decorators, guards, filters, interceptors, dto, utils
├── config/        env schema (zod) + config module
├── prisma/        global PrismaModule + service
├── shared/        zod schemas (auth, user, customer, invoice, dashboard, common) — shared with the frontend
├── modules/
│   ├── auth/      login, refresh rotation, jwt strategy, token service
│   ├── users/     admin CRUD + /me
│   ├── customers/ customer CRUD (createdBy / updatedBy audit)
│   ├── invoices/  invoice CRUD + status state machine + status log
│   ├── dashboard/ aggregated summary
│   └── health/    terminus DB check
├── services/      gateway / auth / users entrypoints (split-services mode)
└── main.ts        helmet, CORS, Swagger, ZodValidationPipe

prisma/schema/     multi-file schema, split per module (base, users, customers, invoices)
```

---

## Deployed application

- **API**: https://mini-erp-api.malvinharis.web.id/api — Swagger at `/docs`.
