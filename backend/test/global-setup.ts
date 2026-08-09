import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testDb = path.resolve(here, 'test-e2e.db').replace(/\\/g, '/');
const dbFile = path.resolve(here, 'test-e2e.db');

export default function globalSetup(): void {
  if (fs.existsSync(dbFile)) fs.rmSync(dbFile);
  execSync('npx prisma db push --accept-data-loss', {
    cwd: path.resolve(here, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: `file:${testDb}`,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
        'Consent: use db push on test DB (Recommended)',
    },
  });
}
