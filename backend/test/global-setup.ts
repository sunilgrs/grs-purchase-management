import { execSync } from 'node:child_process';

const TEST_DB_URL =
  'postgresql://grs_user:grs_dev_password@localhost:5432/grs_test';

export default function globalSetup(): void {
  execSync('npx prisma db push --accept-data-loss --force-reset', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
        'Consent: use db push on test DB (Recommended)',
    },
  });
}
