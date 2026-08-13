import { execSync } from 'node:child_process';

const TEST_DB_URL =
  'postgresql://grs_user:grs_dev_password@localhost:5432/grs_test';

export default function globalSetup(): void {
  const env = { ...process.env, DATABASE_URL: TEST_DB_URL };
  execSync('node scripts/reset-schema.cjs', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });
  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env,
  });
}
