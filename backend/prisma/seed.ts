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

const datePart = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const seq = (prefix: string, n: number) => `${prefix}-${datePart(new Date())}-${String(n).padStart(4, '0')}`;

const DEFAULT_STORES = [
  { storeName: 'IPS Main Store', location: 'Ground Floor, HQ' },
];

async function ensureDefaultStores() {
  for (const store of DEFAULT_STORES) {
    const existing = await prisma.store.findUnique({
      where: { storeName: store.storeName },
    });
    if (!existing) {
      await prisma.store.create({ data: store });
      console.log(`Created default store: ${store.storeName}`);
    }
  }
}

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    await ensureDefaultStores();
    console.log(
      `Database already has ${userCount} user(s); skipping seed. ` +
        'Use `prisma migrate reset` to wipe and re-seed.',
    );
    return;
  }

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

  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      mobile: '9000000001',
      email: 'admin@grs.example',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  const storeKeeper = await prisma.user.create({
    data: {
      name: 'Ramesh Kumar',
      mobile: '9000000002',
      email: 'ramesh@grs.example',
      password: staffPassword,
      role: 'STORE_KEEPER',
    },
  });
  const storeManager = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      mobile: '9000000003',
      email: 'priya@grs.example',
      password: staffPassword,
      role: 'STORE_MANAGER',
    },
  });

  await ensureDefaultStores();
  const mainStore = await prisma.store.findUniqueOrThrow({
    where: { storeName: 'IPS Main Store' },
  });

  const stationery = await prisma.category.create({ data: { name: 'Stationery' } });
  const hardware = await prisma.category.create({ data: { name: 'Hardware' } });
  const safety = await prisma.category.create({ data: { name: 'Safety Equipment' } });

  const vendorA = await prisma.vendor.create({
    data: {
      vendorName: 'Office Supplies Co',
      contactPerson: 'Jane Doe',
      mobile: '9111111111',
      whatsapp: '9111111111',
      email: 'sales@officesupplies.example',
      address: '12 Industrial Rd, Chennai',
    },
  });
  const vendorB = await prisma.vendor.create({
    data: {
      vendorName: 'SafetyPro Distributors',
      contactPerson: 'John Smith',
      mobile: '9222222222',
      whatsapp: '9222222222',
      email: 'orders@safetypro.example',
    },
  });

  const a4Paper = await prisma.item.create({
    data: { itemCode: 'ITM-001', itemName: 'A4 Paper (Ream)', categoryId: stationery.id, unit: 'Ream', preferredVendorId: vendorA.id },
  });
  const pen = await prisma.item.create({
    data: { itemCode: 'ITM-002', itemName: 'Ballpoint Pen (Box of 50)', categoryId: stationery.id, unit: 'Box', preferredVendorId: vendorA.id },
  });
  const gloves = await prisma.item.create({
    data: { itemCode: 'ITM-003', itemName: 'Safety Gloves', categoryId: safety.id, unit: 'Pair', preferredVendorId: vendorB.id },
  });
  const helmet = await prisma.item.create({
    data: { itemCode: 'ITM-004', itemName: 'Safety Helmet', categoryId: safety.id, unit: 'Pcs', preferredVendorId: vendorB.id },
  });

  // REQ-1: fully completed stationery requirement
  const completedReq = await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 1),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'COMPLETED',
      approvedById: storeManager.id,
      remarks: 'Quarterly stationery restock',
      items: {
        create: [
          { itemId: a4Paper.id, quantity: 50 },
          { itemId: pen.id, quantity: 10 },
        ],
      },
    },
  });

  const completedPo = await prisma.purchaseOrder.create({
    data: {
      poNumber: seq('PO', 1),
      requirementId: completedReq.id,
      vendorId: vendorA.id,
      expectedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      notes: 'Delivered at IPS Main Store receiving bay',
      items: {
        create: [
          { itemId: a4Paper.id, orderedQty: 50, receivedQty: 50, unitPrice: 245 },
          { itemId: pen.id, orderedQty: 10, receivedQty: 10, unitPrice: 180 },
        ],
      },
    },
  });

  const completedDelivery = await prisma.delivery.create({
    data: {
      poId: completedPo.id,
      deliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      receivedById: storeKeeper.id,
      status: 'FULL',
      remarks: 'All items received in good condition',
      items: {
        create: [
          { itemId: a4Paper.id, receivedQty: 50, condition: 'GOOD' },
          { itemId: pen.id, receivedQty: 10, condition: 'GOOD' },
        ],
      },
    },
  });

  const resolvedDiscrepancy = await prisma.discrepancy.create({
    data: {
      poId: completedPo.id,
      deliveryId: completedDelivery.id,
      itemId: pen.id,
      discrepancyType: 'DAMAGE',
      quantity: 1,
      description: 'One box of pens crushed in transit; replacement received.',
      status: 'COMPLETED',
    },
  });

  // REQ-2: manager approved, WhatsApp sent, awaiting delivery
  const awaitingReq = await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 2),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      priority: 'HIGH',
      status: 'AWAITING_DELIVERY',
      approvedById: storeManager.id,
      remarks: 'Safety gear for warehouse team',
      items: {
        create: [
          { itemId: gloves.id, quantity: 100 },
          { itemId: helmet.id, quantity: 25 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: seq('PO', 2),
      requirementId: awaitingReq.id,
      vendorId: vendorB.id,
      expectedDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      notes: 'Ship to IPS Main Store loading dock',
      items: {
        create: [
          { itemId: gloves.id, orderedQty: 100, unitPrice: 320 },
          { itemId: helmet.id, orderedQty: 25, unitPrice: 550 },
        ],
      },
    },
  });

  // REQ-3: submitted, awaiting store manager review
  await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 3),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      priority: 'NORMAL',
      status: 'SUBMITTED',
      remarks: 'Monthly pen refill',
      items: {
        create: [{ itemId: pen.id, quantity: 5 }],
      },
    },
  });

  // REQ-4: draft, not yet submitted
  await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 4),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: 'NORMAL',
      status: 'DRAFT',
      remarks: 'Printer paper stock check',
      items: {
        create: [{ itemId: a4Paper.id, quantity: 20 }],
      },
    },
  });

  // REQ-5: rejected by manager
  await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 5),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      priority: 'LOW',
      status: 'REJECTED',
      remarks: 'Rejected: duplicate of existing safety stock order',
      items: {
        create: [{ itemId: gloves.id, quantity: 10 }],
      },
    },
  });

  // REQ-6: partially received, issues raised, verification pending
  const receivedReq = await prisma.requirement.create({
    data: {
      requirementNo: seq('REQ', 6),
      storeId: mainStore.id,
      requestedById: storeKeeper.id,
      requiredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'NORMAL',
      status: 'MATERIAL_RECEIVED',
      approvedById: storeManager.id,
      remarks: 'Bulk gloves order for safety stock',
      items: {
        create: [{ itemId: gloves.id, quantity: 50 }],
      },
    },
  });

  const partialPo = await prisma.purchaseOrder.create({
    data: {
      poNumber: seq('PO', 3),
      requirementId: receivedReq.id,
      vendorId: vendorB.id,
      expectedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'PARTIAL',
      notes: 'Short dispatch expected; balance in a week',
      items: {
        create: [{ itemId: gloves.id, orderedQty: 50, receivedQty: 30, unitPrice: 320 }],
      },
    },
  });

  const partialDelivery = await prisma.delivery.create({
    data: {
      poId: partialPo.id,
      deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      receivedById: storeKeeper.id,
      status: 'PARTIAL',
      remarks: 'Shortage of 20 pairs noted on packing slip',
      items: {
        create: [{ itemId: gloves.id, receivedQty: 30, condition: 'GOOD' }],
      },
    },
  });

  await prisma.discrepancy.create({
    data: {
      poId: partialPo.id,
      deliveryId: partialDelivery.id,
      itemId: gloves.id,
      discrepancyType: 'SHORTAGE',
      quantity: 20,
      description: 'Only 30 of 50 pairs received; 20 short.',
      status: 'ISSUE_RAISED',
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        entityType: 'Requirement',
        entityId: String(completedReq.id),
        action: 'CREATED',
        description: `Requirement ${completedReq.requirementNo} created`,
        performedById: storeKeeper.id,
      },
      {
        entityType: 'Requirement',
        entityId: String(completedReq.id),
        action: 'COMPLETED',
        description: `Requirement ${completedReq.requirementNo} verified and completed`,
        performedById: storeKeeper.id,
      },
      {
        entityType: 'PurchaseOrder',
        entityId: String(completedPo.id),
        action: 'CREATED',
        description: `Purchase order ${completedPo.poNumber} created against requirement ${completedReq.requirementNo}`,
        performedById: storeManager.id,
      },
      {
        entityType: 'Discrepancy',
        entityId: String(resolvedDiscrepancy.id),
        action: 'COMPLETED',
        description: 'Issue DAMAGE on completed PO resolved and closed',
        performedById: storeManager.id,
      },
    ],
  });

  console.log('Seed complete.');
  console.log('  Users:');
  console.log(`    Admin:       admin@grs.example / admin123`);
  console.log(`    StoreMgr:    priya@grs.example / staff123`);
  console.log(`    StoreKeeper: ramesh@grs.example / staff123`);
  console.log(`  Requirements: ${completedReq.requirementNo} (COMPLETED), ${awaitingReq.requirementNo} (AWAITING_DELIVERY), ${receivedReq.requirementNo} (MATERIAL_RECEIVED), plus DRAFT/SUBMITTED/REJECTED.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
