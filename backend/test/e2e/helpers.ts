import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function registerUser(
  app: INestApplication,
  body: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    role?: string;
  },
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(body);
  return res.body as {
    id: number;
    role: string;
    accessToken: string;
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
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
  await prisma.user.deleteMany();
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  storeId: number;
  warehouseId: number;
  vendorAId: number;
  vendorBId: number;
  itemAId: number;
  itemBId: number;
  admin: { id: number; role: string; accessToken: string };
  manager: { id: number; role: string; accessToken: string };
  storeKeeper: { id: number; role: string; accessToken: string };
  purchaser: { id: number; role: string; accessToken: string };
}

export async function seedTestContext(
  app: INestApplication,
): Promise<TestContext> {
  const prisma = app.get(PrismaService);
  await resetDatabase(prisma);

  const store = await prisma.store.create({
    data: { storeName: 'E2E Main Store' },
  });
  const warehouse = await prisma.store.create({
    data: { storeName: 'E2E Warehouse' },
  });
  const vendorA = await prisma.vendor.create({
    data: {
      vendorName: 'E2E Vendor A',
      contactPerson: 'Jane',
      mobile: '9111111111',
      whatsapp: '9111111111',
    },
  });
  const vendorB = await prisma.vendor.create({
    data: {
      vendorName: 'E2E Vendor B',
      contactPerson: 'John',
      mobile: '9222222222',
      whatsapp: '9222222222',
    },
  });
  const itemA = await prisma.item.create({
    data: {
      itemCode: 'E2E-ITM-001',
      itemName: 'E2E Item A',
      unit: 'Pcs',
      preferredVendorId: vendorA.id,
    },
  });
  const itemB = await prisma.item.create({
    data: {
      itemCode: 'E2E-ITM-002',
      itemName: 'E2E Item B',
      unit: 'Pcs',
      preferredVendorId: vendorB.id,
    },
  });

  const admin = await registerUser(app, {
    name: 'E2E Admin',
    mobile: '9100000001',
    email: 'e2e-admin@test.example',
    password: 'secret123',
    role: 'ADMIN',
  });
  const manager = await registerUser(app, {
    name: 'E2E Manager',
    mobile: '9100000002',
    email: 'e2e-manager@test.example',
    password: 'secret123',
    role: 'MANAGER',
  });
  const storeKeeper = await registerUser(app, {
    name: 'E2E Store Keeper',
    mobile: '9100000003',
    email: 'e2e-store@test.example',
    password: 'secret123',
    role: 'STORE_KEEPER',
  });
  const purchaser = await registerUser(app, {
    name: 'E2E Purchaser',
    mobile: '9100000004',
    email: 'e2e-purchaser@test.example',
    password: 'secret123',
    role: 'PURCHASER',
  });

  return {
    app,
    prisma,
    storeId: store.id,
    warehouseId: warehouse.id,
    vendorAId: vendorA.id,
    vendorBId: vendorB.id,
    itemAId: itemA.id,
    itemBId: itemB.id,
    admin,
    manager,
    storeKeeper,
    purchaser,
  };
}
