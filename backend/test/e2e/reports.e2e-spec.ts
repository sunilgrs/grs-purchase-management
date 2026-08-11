import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  seedTestContext,
  auth,
  TestContext,
} from './helpers.js';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  async function seedOrder(overrides: {
    orderDate: Date;
    vendorId: number;
    storeId: number;
    lines: { itemId: number; orderedQty: number; unitPrice: number }[];
  }) {
    const requirement = await ctx.prisma.requirement.create({
      data: {
        requirementNo: `REP-REQ-${overrides.orderDate.getTime()}-${Math.random()}`,
        storeId: overrides.storeId,
        requestedById: ctx.storeKeeper.id,
        requiredDate: overrides.orderDate,
        priority: 'NORMAL',
        status: 'COMPLETED',
      },
    });
    return ctx.prisma.purchaseOrder.create({
      data: {
        poNumber: `REP-PO-${overrides.orderDate.getTime()}-${Math.random()}`,
        requirementId: requirement.id,
        vendorId: overrides.vendorId,
        orderDate: overrides.orderDate,
        expectedDate: overrides.orderDate,
        status: 'COMPLETED',
        items: {
          create: overrides.lines.map((l) => ({
            itemId: l.itemId,
            orderedQty: l.orderedQty,
            receivedQty: l.orderedQty,
            unitPrice: l.unitPrice,
          })),
        },
      },
    });
  }

  it('returns spend grouped by month', async () => {
    const po = await seedOrder({
      orderDate: new Date('2026-07-15T00:00:00Z'),
      vendorId: ctx.vendorAId,
      storeId: ctx.storeId,
      lines: [{ itemId: ctx.itemAId, orderedQty: 5, unitPrice: 100 }],
    });
    expect(po.id).toBeGreaterThan(0);

    const res = await server()
      .get('/api/reports/spend?groupBy=month&from=2026-07-01&to=2026-07-31')
      .set(auth(ctx.admin.accessToken))
      .expect(200);

    expect(res.body.groupBy).toBe('month');
    expect(res.body.total).toBe(500);
    const row = res.body.rows.find(
      (r: { label: string }) => r.label === 'Jul 2026',
    );
    expect(row).toBeDefined();
    expect(row.count).toBe(1);
    expect(row.spend).toBe(500);
  });

  it('groups spend by vendor and store', async () => {
    const token = ctx.admin.accessToken;
    await server()
      .get('/api/reports/spend?groupBy=vendor')
      .set(auth(token))
      .expect(200);
    await server()
      .get('/api/reports/spend?groupBy=store')
      .set(auth(token))
      .expect(200);

    const vendorRes = await server()
      .get('/api/reports/spend?groupBy=vendor&from=2026-01-01&to=2026-12-31')
      .set(auth(token))
      .expect(200);
    expect(vendorRes.body.rows.some((r: { label: string }) => r.label === 'E2E Vendor A')).toBe(true);
  });

  it('filters to the requested date range', async () => {
    const res = await server()
      .get('/api/reports/spend?from=2020-01-01&to=2020-01-31')
      .set(auth(ctx.admin.accessToken))
      .expect(200);
    expect(res.body.total).toBe(0);
    expect(res.body.rows).toEqual([]);
  });

  it('blocks users without the reports feature', async () => {
    await ctx.prisma.user.update({
      where: { id: ctx.storeKeeper.id },
      data: { permissions: JSON.stringify(['deliveries']) },
    });
    await server()
      .get('/api/reports/spend')
      .set(auth(ctx.storeKeeper.accessToken))
      .expect(403);
    await ctx.prisma.user.update({
      where: { id: ctx.storeKeeper.id },
      data: { permissions: null },
    });
  });
});
