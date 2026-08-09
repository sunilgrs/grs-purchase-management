# GRS IPS Purchase Management — Backend

NestJS 11 API for the purchase management system. Prisma 7 + SQLite, JWT auth,
role-based access control, e2e test coverage.

## Setup

```bash
npm install
cp .env.example .env
npx prisma db push       # create dev.db from schema
npx prisma db seed       # load demo data (4 users, stores, vendors, items, requirements)
```

`.env` is gitignored; use `.env.example` as a template.

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
npm run test:e2e         # 42 e2e tests (auth, workflow, rbac) against a dedicated DB
npm run lint
npm run build
```

E2E tests must run single-threaded (`--runInBand`, already configured in `test:e2e`).

## Prisma

```bash
npx prisma studio        # browse data
npx prisma migrate dev   # create a migration after schema changes
npx prisma db seed       # re-seed demo data (wipes existing rows)
```

Note: Prisma 7 asks for `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` consent for
`db push` operations.
