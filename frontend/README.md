# GRS IPS Purchase Management — Frontend

React 19 + Vite 8 + TypeScript + Tailwind CSS + React Router 7 SPA for the purchase
management system.

## Run

```bash
npm install
npm run dev
```

Serves on `http://localhost:5173` and proxies `/api` to the backend at
`http://localhost:3000`. Start the backend first (see `../backend/README.md`).

## Test

```bash
npm run test           # 257 tests across 25 files (Vitest + Testing Library + jsdom)
npm run test:coverage  # with coverage report (thresholds enforced in vitest.config.ts)
npm run lint           # oxlint
npm run build          # tsc -b && vite build
```

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Vite dev server with HMR             |
| `npm run build`     | Type-check + production build        |
| `npm run preview`   | Preview the production build         |
| `npm run test`      | Run the Vitest suite once            |
| `npm run test:watch`| Run Vitest in watch mode             |
| `npm run test:coverage` | Run Vitest with coverage report  |
| `npm run lint`      | Oxlint                               |
