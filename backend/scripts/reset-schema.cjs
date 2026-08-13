// Drops and recreates the public schema of the target database.
// Equivalent to the schema reset performed by `prisma db push --force-reset`,
// but does not require the CREATEDB role attribute. Used by prisma migrate
// workflows (dev reset / e2e setup).
//
// Usage: DATABASE_URL=<url> node scripts/reset-schema.cjs
require('dotenv/config');

const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const masked = url.replace(/:\/\/[^@]*@/, '://***@');

const guard = setTimeout(() => {
  console.error(`Schema reset timed out for ${masked}`);
  process.exit(1);
}, 30000);

console.log(`Connecting to ${masked}...`);
pool
  .query('DROP SCHEMA IF EXISTS public CASCADE')
  .then(() => {
    console.log('Dropped. Recreating public schema...');
    return pool.query('CREATE SCHEMA public');
  })
  .then(() => pool.end())
  .then(() => {
    clearTimeout(guard);
    console.log(`Schema reset complete for ${masked}`);
  })
  .catch((err) => {
    clearTimeout(guard);
    console.error(`Schema reset failed for ${masked}:`, err.message);
    process.exit(1);
  });
