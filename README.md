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
- **Roles**: `ADMIN`, `MANAGER`, `STORE_MANAGER`, `STORE_KEEPER` — endpoint-level enforcement on the backend, with matching UI gating on the frontend. `STORE_KEEPER` creates requirements, records deliveries, and raises discrepancies; `STORE_MANAGER` additionally reviews/approves requirements and discrepancies; `MANAGER` and `ADMIN` see every tab and run purchase-order and WhatsApp actions.

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

A full deployment runs the backend, the frontend (served by Nginx), and **Caddy** as an HTTPS
reverse proxy, with a persistent SQLite volume — one command:

```bash
# 1. Set a strong secret (optional; defaults are dev-only) and your site address
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "SITE_ADDRESS=localhost" >> .env    # or your domain / LAN IP / custom hostname

# 2. Build and start
docker compose up -d --build

# 3. (First run only) load demo data
docker compose exec backend npx prisma db seed
```

Then open:

- **https://localhost** — the frontend (HTTPS)
- **https://localhost/api/health** — API health check

### TLS

Caddy terminates TLS automatically, so there is no certificate to generate by hand:

- `SITE_ADDRESS=localhost` or a private IP (e.g. `192.168.1.50`) → Caddy issues a self-signed
  certificate from its internal CA. No DNS needed, works straight away.
- `SITE_ADDRESS=purchase.example.com` → Caddy obtains a real **Let's Encrypt** certificate and
  renews it automatically. Ports 80/443 must reach this machine, and `CORS_ORIGINS` should use
  the `https://` origin.
- A **custom local hostname** (e.g. `SITE_ADDRESS=ips-purchase-manager`) → not `localhost`, so
  Caddy would try Let's Encrypt and fail. Set `TLS_INTERNAL=internal` in `.env` to force the
  internal CA, and map the name to loopback so the browser finds it:
  - Add `127.0.0.1 ips-purchase-manager` to `C:\Windows\System32\drivers\etc\hosts` (admin).
  - Add `https://ips-purchase-manager` to `CORS_ORIGINS` in `.env`.

HTTP on port 80 is automatically redirected to HTTPS.

To trust the internal CA so browsers/curl stop warning about the self-signed certificate, import
Caddy's root certificate once:

```bash
docker compose exec caddy cat /data/caddy/pki/authorities/local/root.crt > caddy-root.crt

# Windows (admin PowerShell)
certutil -addstore -f Root .\caddy-root.crt
# or double-click caddy-root.crt -> Install Certificate -> Local Machine -> Trusted Root Certification Authorities
```

Notes:

- The backend (`:3000`) and frontend (`:8080`) containers are no longer published on the host;
  all traffic goes through Caddy on port 443 (HTTPS) with port 80 redirecting to it.
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
  The Nginx container proxies `/api`, so browsers talking to the frontend are same-origin regardless.
- **HTTPS** — TLS is terminated by the bundled Caddy proxy (see [Docker deployment](#docker-deployment)).
  Self-signed by default for localhost/private IPs; a public `SITE_ADDRESS` gets an automatic
  Let's Encrypt certificate. Set `CORS_ORIGINS` to the public `https://` origin when using one.

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
| Manager       | manager@grs.example   | manager123 |
| Store manager | priya@grs.example     | staff123   |
| Store keeper  | ramesh@grs.example    | staff123   |

## Testing

```bash
# Backend — unit (76) + e2e (81) tests
cd backend
npm run test
npm run test:e2e
npm run lint
npm run build

# Frontend — unit/component tests (250 tests) with coverage
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
