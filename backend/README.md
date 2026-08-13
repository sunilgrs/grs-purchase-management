# GRS IPS Purchase Management — Backend

NestJS 11 API for the purchase management system. Prisma 7 + PostgreSQL, JWT auth,
role-based access control, e2e test coverage.

## Prerequisites

- PostgreSQL running on `localhost:5432` with a `grs_user` login and two databases:
  - `grs_purchase` (dev)
  - `grs_test` (e2e)
- Suggested setup (run as the postgres superuser):
  ```sql
  CREATE ROLE grs_user WITH LOGIN PASSWORD 'grs_dev_password';
  CREATE DATABASE grs_purchase OWNER grs_user;
  CREATE DATABASE grs_test OWNER grs_user;
  ```

## Setup

```bash
npm install
cp .env.example .env        # then set DATABASE_URL if needed
npx prisma db push          # create schema in the dev database
npx prisma db seed          # load demo data (4 users, stores, vendors, items, requirements)
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
The e2e setup (`test/global-setup.ts`) resets `grs_test` via `prisma db push --force-reset`.

## Prisma

```bash
npx prisma studio        # browse data
npx prisma migrate dev   # create a migration after schema changes
npx prisma db seed       # re-seed demo data (wipes existing rows)
tsx prisma/reset.ts      # wipe all data, keep a single admin account
```

Note: Prisma 7 asks for `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` consent for
`db push` operations.
