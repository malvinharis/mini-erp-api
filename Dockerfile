# Standalone NestJS API (polyrepo). Build context = this directory.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---------- build ----------
FROM base AS build
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm prisma:generate && pnpm build

# ---------- runtime ----------
FROM base AS runtime
ENV NODE_ENV=production
# copy the built app (incl. node_modules with the prisma CLI for migrate deploy),
# owned by the unprivileged built-in `node` user
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 4000
# run pending migrations on start, then boot. call the prisma binary directly
# so no pnpm/network is needed at runtime.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
