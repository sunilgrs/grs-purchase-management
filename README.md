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
# Backend — http://localhost:3000 (API under /api)
cd backend
npm install
cp .env.example .env            # then edit if needed
npx prisma db push              # create dev.db from schema
npx prisma db seed              # load demo data
npm run start:dev

# Frontend — http://localhost:5173 (proxies /api to :3000)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with a demo account.

## Demo accounts

| Role        | Email                 | Password   |
| ----------- | --------------------- | ---------- |
| Admin       | admin@grs.example     | admin123   |
| Manager     | manager@grs.example   | manager123 |
| Store keeper| ramesh@grs.example    | staff123   |
| Purchaser   | priya@grs.example     | staff123   |

## Testing

```bash
# Backend — e2e (42 tests: auth, workflow, rbac)
cd backend
npm run test:e2e
npm run lint
npm run build

# Frontend — unit/component tests (175 tests) with coverage
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
