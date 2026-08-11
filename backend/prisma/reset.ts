import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  }),
});

async function main() {
  // Children first so foreign keys stay intact
  await prisma.discrepancy.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.requirementItem.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.store.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notificationRead.deleteMany();
  await prisma.user.deleteMany();

  // Restart all AUTOINCREMENT counters from 1
  await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');

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
