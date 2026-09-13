# GRS IPS Purchase Management

A purchase management system for GRS IPS stores: requirement tracking, approval workflow,
purchase orders, delivery tracking, discrepancy issue lifecycle, and WhatsApp vendor
notifications — with role-based access control.

- **Backend** — NestJS 11 + Prisma 7 (PostgreSQL) + JWT auth in [`backend/`](backend/)
- **Frontend** — React 19 + Vite 8 + TypeScript + Tailwind CSS in [`frontend/`](frontend/)

## Architecture

```
Requirement → Approval → PO → WhatsApp → Delivery → Verification → Completed
                                        ↘ Discrepancy → Review → Vendor → Replacement → Completed
```

- **Requirement statuses**: `DRAFT → SUBMITTED → PENDING_MANAGER_APPROVAL → VENDOR_ASSIGNED → WHATSAPP_SENT → AWAITING_DELIVERY → MATERIAL_RECEIVED → VERIFICATION_PENDING → COMPLETED`, plus `REJECTED`.
- **Discrepancy statuses**: `ISSUE_RAISED → MANAGER_REVIEW → VENDOR_NOTIFIED → REPLACEMENT_AWAITED → REPLACEMENT_RECEIVED → VERIFIED → COMPLETED`, plus `REJECTED`.
- **Auto-raised issues**: recording a delivery with `DAMAGED`, `SHORTAGE`, or `MISMATCH` line conditions automatically raises a discrepancy (`DAMAGE`, `SHORTAGE`, or `WRONG_ITEM`) for that line. Issues can also be raised manually.
- **Roles**: `ADMIN`, `MANAGER`, `STORE_MANAGER`, `STORE_KEEPER` — endpoint-level enforcement on the backend, with matching UI gating on the frontend. `STORE_KEEPER` creates requirements, records deliveries, and raises discrepancies; `STORE_MANAGER` additionally runs the first-level store manager review of requirements and starts discrepancy reviews; the final manager review/approval (requirement vendor assignment and discrepancy decision) is `MANAGER`/`ADMIN` only. `MANAGER` and `ADMIN` see every tab and run purchase-order and WhatsApp actions.

## Quickstart

Prerequisites: Node.js 20+, npm, and a running **PostgreSQL** database (the schema is
PostgreSQL-only).

```bash
# One-shot setup (installs both apps, generates the Prisma client)
npm run setup

# Backend — http://localhost:3000 (API under /api)
cd backend
cp .env.example .env            # then set DATABASE_URL to your local PostgreSQL
npx prisma migrate deploy       # apply the checked-in migrations
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
| `npm run db:push`  | Apply schema changes to a local DB (dev only; prod uses migrations) |
| `npm run seed`     | Load demo data into the backend DB                     |
| `npm run test`     | Backend unit + e2e, then frontend tests                |
| `npm run test:coverage` | Backend unit + frontend coverage reports          |
| `npm run lint`     | ESLint (backend) + Oxlint (frontend)                   |
| `npm run build`    | Build both apps                                        |

## Deploy to Render

The repo ships with a [Render Blueprint](render.yaml) (Render PostgreSQL + NestJS web
service + React static site). Deploying it provisions all three together:

1. Push this repository to GitHub (`main` branch) — `render.yaml` must be at the repo root.
2. In the Render dashboard: **New → Blueprint** → pick your repository → **main**.
3. Render reads `render.yaml` and creates:

   | Resource                    | Kind                | Purpose                    |
   | --------------------------- | ------------------- | -------------------------- |
   | `grs-purchase-db`           | PostgreSQL          | Database                   |
   | `grs-purchase-api`          | Web service (Node)  | NestJS API on `/api`       |
   | `grs-purchase-web`          | Static site         | React app                  |

**What Render runs for you** (see `render.yaml`):

- **Backend build**: `cd backend && npm install --include=dev && npm run build && npx prisma migrate deploy && npx prisma db seed`
- **Backend start**: `cd backend && npm run start:prod`
- **Frontend build**: `cd frontend && npm install --include=dev && npm run build` → serves `frontend/dist`

The backend receives `DATABASE_URL` (from the Render database), a freshly generated
`JWT_SECRET`, and `CORS_ORIGINS=https://grs-purchase-web.onrender.com`. The frontend
build receives `VITE_API_URL=https://grs-purchase-api.onrender.com/api`.

After the blueprint finishes, both services are reachable at:

- **Frontend** — `https://grs-purchase-web.onrender.com`
- **API health** — `https://grs-purchase-api.onrender.com/api/health`

The seed only runs when the database has zero users, so re-deploys don't duplicate demo
data. After verifying the login/purchase workflow, change the demo passwords or delete the
demo accounts (see [Demo accounts](#demo-accounts)) before real users sign up.

> **Deploying updates:** commit and push to `main`. `render.yaml` changes are applied via
> **Sync** in the Blueprint, and each service rebuilds automatically from new commits.

## Production hardening

- **JWT secret** — Render generates a fresh `JWT_SECRET` for the blueprint. Never commit a
  secret; if you need one locally use `openssl rand -hex 32`.
- **Rate limiting** — the API is rate-limited (100 req/min globally, 10 req/min on `/api/auth/*`).
  Disabled when `NODE_ENV=test` so test suites are unaffected.
- **CORS** — the backend only allows origins in `CORS_ORIGINS`. Production ships the Render
  frontend URL; local dev defaults to the Vite dev ports (see `backend/.env.example`).
- **HTTPS** — terminated by Render automatically (both services have `https://` URLs).

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

## Deactivating records (soft delete)

Vendors, Items and Users are never hard-deleted. The **Deactivate** button on those
tabs sets `active = false` (or `status = INACTIVE` for users) instead of deleting,
so the record can be brought back later by editing it and re-enabling it.

Each of those tabs has a **Show: All / Active / Inactive** filter on the right of the
page header to browse every record, including deactivated ones.

## Feature access permissions

Admins can control which tabs each user can open from the **Settings** tab
(Administration section in the sidebar).

- When no permissions are set (`permissions = null`) a user gets the role defaults:
  `STORE_KEEPER` and `STORE_MANAGER` see Dashboard, Requirements, Deliveries, and
  Discrepancies; `MANAGER` and `ADMIN` can open every tab.
- When permissions are set, the user can only see and use the granted tabs. Both the
  sidebar and the API enforce this: a `FeatureGuard` checks the request against the
  user's stored permissions on every call, so changes apply immediately without a
  re-login (the sidebar updates on the user's next login).
- Tabs: Dashboard, Vendors, Items, Users, Requirements, Purchase Orders, Deliveries,
  Discrepancies, Audit Logs.
- Admin is a super user: they can always manage the Users tab / Settings even if
  their own permission list omits it, so they can never lock themselves out.
- Endpoints: `GET /api/users`, `PATCH /api/users/:id/permissions`
  (`{ "permissions": ["requirements", "items"] | null }`, admin only).

## Demo accounts

| Role          | Email                 | Password   |
| ------------- | --------------------- | ---------- |
| Admin         | admin@grs.example     | admin123   |
| Store manager | priya@grs.example     | staff123   |
| Store keeper  | ramesh@grs.example    | staff123   |

## Testing

```bash
# Backend — unit (82) + e2e (92) tests
cd backend
npm run test
npm run test:e2e
npm run lint
npm run build

# Frontend — unit/component tests (267 tests) with coverage
cd frontend
npm run test
npm run test:coverage
npm run lint
npm run build
```

## Database

- Runtime DB is **PostgreSQL** (the Prisma schema sets `provider = "postgresql"`).
  Production DB comes from the Render blueprint; local dev uses the `DATABASE_URL` in
  `backend/.env`.
- Apply checked-in migrations with `npx prisma migrate deploy` (production) or
  `npx prisma migrate dev` (local development).
- The seed (`prisma db seed`) inserts demo users, stores, items and requirements, but only
  when the database has zero users — so it is safe to run on each deploy.
- E2E tests need a local PostgreSQL (the GitHub Actions workflow spins one up) and must run
  single-threaded (`--runInBand`).
