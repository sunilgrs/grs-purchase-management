# GRS IPS Purchase Management — Backend

NestJS 11 API for the purchase management system. Prisma 7 + PostgreSQL, JWT auth,
role-based access control, e2e test coverage.

## Prerequisites

- PostgreSQL running on `localhost:5432` with a `grs_user` login and two databases:
  - `grs_purchase` (dev)
  - `grs_test` (e2e)
- Suggested setup (run as the postgres superuser):
  ```sql
  CREATE ROLE grs_user WITH LOGIN PASSWORD 'grs_dev_password' CREATEDB;
  CREATE DATABASE grs_purchase OWNER grs_user;
  CREATE DATABASE grs_test OWNER grs_user;
  ```
  `CREATEDB` is required so `prisma migrate dev/reset` can create shadow databases.
  If it cannot be granted, use `node scripts/reset-schema.cjs` (drops and recreates the
  `public` schema) followed by `npx prisma migrate deploy`.

## Setup

```bash
npm install
cp .env.example .env        # then set DATABASE_URL if needed
npx prisma migrate reset    # create schema from migrations and seed demo data
```

`.env` is gitignored; use `.env.example` as a template. The API rate-limits requests
(100/min globally, 10/min on `/api/auth/*`; disabled when `NODE_ENV=test`) and CORS-allowlists
origins from `CORS_ORIGINS` (defaults to the localhost dev/8080 ports).

## Run

```bash
npm run start            # production-style start
npm run start:dev        # watch mode
npm run start:prod       # node dist/src/main
```

Serves on `http://localhost:3000` with the global `/api` prefix and CORS enabled for the
Vite dev server. Set `PORT` in `.env` to override.

## Test

```bash
npm run test          # unit tests against src
npm run test:e2e      # e2e tests (auth, workflow, rbac, permissions) against grs_test
npm run test:cov      # unit tests with coverage
npm run lint
npm run build
```

E2E tests must run single-threaded (`--runInBand`, already configured in `test:e2e`).
The e2e setup (`test/global-setup.ts`) resets `grs_test` via `scripts/reset-schema.cjs`
and then applies migrations with `prisma migrate deploy`.

## Prisma

```bash
npx prisma studio        # browse data
npx prisma migrate dev   # create a migration after schema changes
npx prisma migrate deploy # apply pending migrations (CI / Render.com)
npx prisma migrate reset  # drop, replay migrations, and re-seed
npx prisma db seed        # seed demo data (no-op if users already exist)
node scripts/reset-schema.cjs # drop + recreate the public schema (no CREATEDB needed)
tsx prisma/reset.ts       # wipe all data, keep a single admin account
```

Deploys on Render.com run `prisma migrate deploy` (see `render.yaml`). For environments
where `grs_user` lacks `CREATEDB`, `migrate reset`/`migrate dev` fall back to
`reset-schema.cjs` + `migrate deploy`.
