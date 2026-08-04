import 'reflect-metadata';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * API gateway — single public origin (:GATEWAY_PORT) that reverse-proxies each
 * path prefix to the feature service running on its own port. The browser and
 * Swagger clients only ever talk to this port; services stay internal.
 */
const PORT = Number(process.env.GATEWAY_PORT ?? 4000);
const AUTH_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001';
const USERS_URL = process.env.USERS_SERVICE_URL ?? 'http://localhost:4002';
const CORE_URL = process.env.CORE_SERVICE_URL ?? 'http://localhost:4003';
const ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const app = express();

// CORS at the edge — services sit behind the gateway, so one allowlist here is
// enough. Credentials on for httpOnly cookie auth.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Path prefix -> target service. changeOrigin rewrites the Host header; the
// path is forwarded unchanged so each service keeps its own `/api` prefix.
const routes: Array<{ prefix: string; target: string }> = [
  { prefix: '/api/auth', target: AUTH_URL },
  { prefix: '/api/users', target: USERS_URL },
  { prefix: '/api/customers', target: CORE_URL },
  { prefix: '/api/invoices', target: CORE_URL },
  { prefix: '/api/dashboard', target: CORE_URL },
];

for (const { prefix, target } of routes) {
  app.use(prefix, createProxyMiddleware({ target, changeOrigin: true, xfwd: true }));
}

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', services: routes.map((r) => r.prefix) }),
);

app.listen(PORT, () => {
  console.log(`mini-erp gateway listening on :${PORT} -> auth ${AUTH_URL}, users ${USERS_URL}`);
});
