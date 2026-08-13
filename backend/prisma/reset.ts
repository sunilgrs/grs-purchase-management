import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    process.env.DATABASE_URL ??
      'postgresql://grs_user:grs_dev_password@localhost:5432/grs_purchase',
  ),
});

async function main() {
  // Wipe every table and restart identity counters from 1
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);

  // Keep a single admin account so the app can be logged into
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      mobile: '9000000001',
      email: 'admin@grs.example',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  console.log('Database reset complete.');
  console.log('  All business data deleted; IDs restarted from 1.');
  console.log(`  Admin login: 9000000001 / admin123 (${admin.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
