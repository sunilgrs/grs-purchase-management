# GRS IPS Purchase Management

A purchase management system for GRS IPS stores: requirement tracking, approval workflow,
purchase orders, delivery tracking, discrepancy issue lifecycle, and WhatsApp vendor
notifications — with role-based access control.

- **Backend** — NestJS 11 + Prisma 7 (SQLite) + JWT auth in [`backend/`](backend/)
- **Frontend** — React 19 + Vite 8 + TypeScript + Tailwind CSS in [`frontend/`](frontend/)

## Architecture

```
Requirement → Approval → PO → WhatsApp → Delivery → Verification → Completed
                                        ↘ Discrepancy → Review → Vendor → Replacement → Completed
```

- **Requirement statuses**: `DRAFT → SUBMITTED → PENDING_MANAGER_APPROVAL → VENDOR_ASSIGNED → WHATSAPP_SENT → AWAITING_DELIVERY → MATERIAL_RECEIVED → VERIFICATION_PENDING → COMPLETED`, plus `REJECTED`.
- **Discrepancy statuses**: `ISSUE_RAISED → MANAGER_REVIEW → VENDOR_NOTIFIED → REPLACEMENT_AWAITED → REPLACEMENT_RECEIVED → VERIFIED → COMPLETED`, plus `REJECTED`.
- **Auto-raised issues**: recording a delivery with `DAMAGED`, `SHORTAGE`, or `MISMATCH` line conditions automatically raises a discrepancy (`DAMAGE`, `SHORTAGE`, or `WRONG_ITEM`) for that line. Issues can also be raised manually.
- **Roles**: `ADMIN`, `MANAGER`, `STORE_KEEPER`, `PURCHASER` — endpoint-level enforcement on the backend, with matching UI gating on the frontend.

## Quickstart

Prerequisites: Node.js 20+, npm.

```bash
# One-shot setup (installs both apps, generates the Prisma client)
npm run setup

# Backend — http://localhost:3000 (API under /api)
cd backend
cp .env.example .env            # then edit if needed
npx prisma db push              # create dev.db from schema
npx prisma db seed              # load demo data
npm run start:dev

# Frontend — http://localhost:5173 (proxies /api to :3000)
cd frontend
npm run dev
```

Or run both dev servers together from the root:

```bash
npm run dev
```

Open http://localhost:5173 and log in with a demo account.

## Root scripts

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Backend (`start:dev`) + frontend (Vite) together       |
| `npm run setup`    | Install both apps and generate the Prisma client       |
| `npm run db:push`  | Create the backend SQLite DB from the schema           |
| `npm run seed`     | Load demo data into the backend DB                     |
| `npm run test`     | Backend unit + e2e, then frontend tests                |
| `npm run test:coverage` | Backend unit + frontend coverage reports          |
| `npm run lint`     | ESLint (backend) + Oxlint (frontend)                   |
| `npm run build`    | Build both apps                                        |

## Docker deployment

A full deployment runs the backend (API on `:3000`), the frontend (served by Nginx), and a
persistent SQLite volume — one command:

```bash
# 1. Set a strong secret (optional; defaults are dev-only)
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 2. Build and start
docker compose up -d --build

# 3. (First run only) load demo data
docker compose exec backend npx prisma db seed
```

Then open http://localhost:8080 (frontend) or http://localhost:3000/api/health (API health check).

Notes:

- The database is a SQLite file inside the `grs-data` volume (mounted at `/app/data/grs.db` in the
  backend container). Migrations run automatically on container start.
- `docker compose down` keeps the data volume; `docker compose down -v` wipes it.
- To run the backend outside Docker against a file on disk, keep the existing local workflow
  (`npx prisma db push && npx prisma db seed`).

## Production hardening

- **JWT secret** — set a strong `JWT_SECRET` in `.env` (see `.env.example`). Never use the default.
- **Rate limiting** — the API is rate-limited (100 req/min globally, 10 req/min on `/api/auth/*`).
  Disabled when `NODE_ENV=test` so test suites are unaffected.
- **CORS** — the backend only allows origins in `CORS_ORIGINS` (default: localhost dev ports).
  The Nginx container proxies `/api`, so browsers talking to `:8080` are same-origin regardless.
- **HTTPS** — terminate TLS at a reverse proxy in front of the `frontend` container (e.g. Nginx +
  Let's Encrypt / Certbot, or your cloud load balancer), then set `CORS_ORIGINS` to the public
  `https://` origin.

## Bulk item import (Excel)

Admins and managers can upload an Excel item master from the **Items** tab
(**Import Excel** button) to create or update items in bulk.

- **`POST /api/items/import`** — `multipart/form-data`, field `file`
  (`.xlsx` or `.xls`, max 2 MB). Restricted to `ADMIN`/`MANAGER`.
- Items are **upserted by Item Code** (matching rows are updated, new codes created).
- Rows with a missing Code/Name or an unknown Category/Vendor name are skipped and
  reported in the response summary (`{ created, updated, skipped, errors }`).

Expected columns (first row = headers, order-independent):

| Column        | Required | Notes                                   |
| ------------- | -------- | --------------------------------------- |
| Item Code     | Yes      | Unique code, e.g. `ITM-001`             |
| Item Name     | Yes      | Display name                            |
| Unit          | No       | Defaults to `Nos`                       |
| Category      | No       | Must match an existing category name    |
| Vendor        | No       | Preferred vendor; must match a vendor name |
| Active        | No       | `yes/no`, `true/false`, `1/0`; default yes |

> Tip: export the existing Items table from the UI to get a starting file, then edit
> and re-upload it.

## Demo accounts

| Role        | Email                 | Password   |
| ----------- | --------------------- | ---------- |
| Admin       | admin@grs.example     | admin123   |
| Manager     | manager@grs.example   | manager123 |
| Store keeper| ramesh@grs.example    | staff123   |
| Purchaser   | priya@grs.example     | staff123   |

## Testing

```bash
# Backend — unit (31) + e2e (53) tests
cd backend
npm run test
npm run test:e2e
npm run lint
npm run build

# Frontend — unit/component tests (179 tests) with coverage
cd frontend
npm run test
npm run test:coverage
npm run lint
npm run build
```

## Database

- Runtime DB: `backend/dev.db` (gitignored). Rebuild anytime with `npx prisma db push` and `npx prisma db seed`.
- E2E tests use a separate DB (`backend/test/test-e2e.db`) and must run single-threaded (`--runInBand`).
- Prisma 7 requires `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` consent for `db push`.
