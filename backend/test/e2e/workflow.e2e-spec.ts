import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  seedTestContext,
  auth,
  TestContext,
} from './helpers.js';

describe('Purchase workflow (e2e)', () => {
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

  function makeRequirement(overrides: Record<string, unknown> = {}) {
    return {
      storeId: ctx.storeId,
      requestedById: ctx.storeKeeper.id,
      requiredDate: new Date(Date.now() + 10 * 86400000)
        .toISOString()
        .slice(0, 10),
      priority: 'HIGH',
      items: [{ itemId: ctx.itemAId, quantity: 5 }],
      ...overrides,
    };
  }

  it('walks a requirement through the full workflow to COMPLETED', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement())
      .expect(201);
    const reqId = create.body.id;
    expect(create.body.status).toBe('DRAFT');

    await server()
      .post(`/api/requirements/${reqId}/submit`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/requirements/${reqId}/store-manager-review`)
      .set(auth(ctx.manager.accessToken))
      .send({ approve: true })
      .expect(201);

    const approve = await server()
      .post(`/api/requirements/${reqId}/approve`)
      .set(auth(ctx.manager.accessToken))
      .send({
        vendorId: ctx.vendorAId,
        expectedDate: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10),
        items: [{ itemId: ctx.itemAId, orderedQty: 5, unitPrice: 100 }],
      })
      .expect(201);
    const po = approve.body;
    expect(po.poNumber).toMatch(/^PO-/);

    const assigned = await server()
      .get(`/api/requirements/${reqId}`)
      .set(auth(token))
      .expect(200);
    expect(assigned.body.status).toBe('VENDOR_ASSIGNED');

    const wa = await server()
      .get(`/api/requirements/${reqId}/whatsapp-message`)
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    expect(wa.body.message).toContain('E2E Vendor A');
    expect(wa.body.waLink).toContain('https://wa.me/9111111111');
    expect(wa.body.poNumber).toBe(po.poNumber);
    expect(wa.body.formats).toHaveLength(3);
    expect(wa.body.formats.map((f: { id: string }) => f.id)).toEqual([
      'formal',
      'short',
      'friendly',
    ]);

    await server()
      .post(`/api/requirements/${reqId}/mark-whatsapp-sent`)
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(201);
    await server()
      .post(`/api/requirements/${reqId}/mark-awaiting-delivery`)
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(201);

    const delivery = await server()
      .post('/api/deliveries')
      .set(auth(token))
      .send({
        poId: po.id,
        receivedById: ctx.storeKeeper.id,
        status: 'FULL',
        items: [{ itemId: ctx.itemAId, receivedQty: 5, condition: 'GOOD' }],
      })
      .expect(201);
    expect(delivery.body.status).toBe('FULL');

    const received = await server()
      .get(`/api/requirements/${reqId}`)
      .set(auth(token))
      .expect(200);
    expect(received.body.status).toBe('MATERIAL_RECEIVED');

    await server()
      .post(`/api/requirements/${reqId}/verify`)
      .set(auth(token))
      .send({ approved: true })
      .expect(201);

    const completed = await server()
      .get(`/api/requirements/${reqId}`)
      .set(auth(token))
      .expect(200);
    expect(completed.body.status).toBe('COMPLETED');

    const completedPo = await server()
      .get(`/api/purchase-orders/${po.id}`)
      .set(auth(token))
      .expect(200);
    expect(completedPo.body.status).toBe('COMPLETED');
  });

  it('rejects illegal transitions with 400', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement())
      .expect(201);
    const reqId = create.body.id;

    await server()
      .post(`/api/requirements/${reqId}/submit`)
      .set(auth(token))
      .send({})
      .expect(201);

    // verify before material received
    await server()
      .post(`/api/requirements/${reqId}/verify`)
      .set(auth(token))
      .send({ approved: true })
      .expect(400);

    // mark-whatsapp-sent before vendor assigned
    await server()
      .post(`/api/requirements/${reqId}/mark-whatsapp-sent`)
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(400);

    // mark-awaiting-delivery before any vendor assignment
    await server()
      .post(`/api/requirements/${reqId}/mark-awaiting-delivery`)
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(400);
  });

  it('walks a discrepancy issue through the lifecycle to COMPLETED', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement({ items: [{ itemId: ctx.itemBId, quantity: 4 }] }))
      .expect(201);
    const reqId = create.body.id;

    await server()
      .post(`/api/requirements/${reqId}/submit`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/requirements/${reqId}/store-manager-review`)
      .set(auth(ctx.manager.accessToken))
      .send({ approve: true })
      .expect(201);
    const approve = await server()
      .post(`/api/requirements/${reqId}/approve`)
      .set(auth(ctx.manager.accessToken))
      .send({
        vendorId: ctx.vendorBId,
        expectedDate: new Date().toISOString().slice(0, 10),
        items: [{ itemId: ctx.itemBId, orderedQty: 4, unitPrice: 50 }],
      })
      .expect(201);
    const po = approve.body;

    const delivery = await server()
      .post('/api/deliveries')
      .set(auth(token))
      .send({
        poId: po.id,
        receivedById: ctx.storeKeeper.id,
        status: 'PARTIAL',
        items: [{ itemId: ctx.itemBId, receivedQty: 3, condition: 'GOOD' }],
      })
      .expect(201);

    const dis = await server()
      .post('/api/discrepancies')
      .set(auth(token))
      .send({
        poId: po.id,
        deliveryId: delivery.body.id,
        itemId: ctx.itemBId,
        discrepancyType: 'SHORTAGE',
        quantity: 1,
        description: 'One item missing',
      })
      .expect(201);
    const disId = dis.body.id;
    expect(dis.body.status).toBe('ISSUE_RAISED');

    await server()
      .post(`/api/discrepancies/${disId}/start-review`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/discrepancies/${disId}/manager-review`)
      .set(auth(ctx.manager.accessToken))
      .send({ approve: true })
      .expect(201);

    const wa = await server()
      .get(`/api/discrepancies/${disId}/whatsapp-message`)
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    expect(wa.body.message).toContain('E2E Vendor B');

    await server()
      .post(`/api/discrepancies/${disId}/await-replacement`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/discrepancies/${disId}/replacement-received`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/discrepancies/${disId}/verify`)
      .set(auth(token))
      .send({ approved: true })
      .expect(201);
    await server()
      .post(`/api/discrepancies/${disId}/complete`)
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(201);

    const final = await server()
      .get(`/api/discrepancies/${disId}`)
      .set(auth(token))
      .expect(200);
    expect(final.body.status).toBe('COMPLETED');
  });

  it('auto-raises discrepancies from damaged/shortage delivery lines', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement({ items: [{ itemId: ctx.itemBId, quantity: 4 }] }))
      .expect(201);
    const reqId = create.body.id;

    await server()
      .post(`/api/requirements/${reqId}/submit`)
      .set(auth(token))
      .send({})
      .expect(201);
    await server()
      .post(`/api/requirements/${reqId}/store-manager-review`)
      .set(auth(ctx.manager.accessToken))
      .send({ approve: true })
      .expect(201);
    const approve = await server()
      .post(`/api/requirements/${reqId}/approve`)
      .set(auth(ctx.manager.accessToken))
      .send({
        vendorId: ctx.vendorBId,
        expectedDate: new Date().toISOString().slice(0, 10),
        items: [{ itemId: ctx.itemBId, orderedQty: 4, unitPrice: 50 }],
      })
      .expect(201);
    const po = approve.body;

    const delivery = await server()
      .post('/api/deliveries')
      .set(auth(token))
      .send({
        poId: po.id,
        receivedById: ctx.storeKeeper.id,
        status: 'PARTIAL',
        items: [
          {
            itemId: ctx.itemBId,
            receivedQty: 3,
            condition: 'SHORTAGE',
            remarks: 'One item short',
          },
        ],
      })
      .expect(201);

    const discs = await server()
      .get('/api/discrepancies')
      .set(auth(token))
      .expect(200);
    const auto = discs.body.find(
      (d: { deliveryId: number }) => d.deliveryId === delivery.body.id,
    );
    expect(auto).toBeDefined();
    expect(auto.discrepancyType).toBe('SHORTAGE');
    expect(auto.status).toBe('ISSUE_RAISED');
    expect(auto.quantity).toBe(1);
    expect(auto.description).toContain('Auto-raised');

    const delivered = await server()
      .get(`/api/deliveries/${delivery.body.id}`)
      .set(auth(token))
      .expect(200);
    expect(delivered.body.status).toBe('PARTIAL');
  });

  it('edits a DRAFT requirement as the owning store keeper', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement())
      .expect(201);
    const reqId = create.body.id;
    expect(create.body.status).toBe('DRAFT');

    const updated = await server()
      .patch(`/api/requirements/${reqId}`)
      .set(auth(token))
      .send({
        priority: 'URGENT',
        remarks: 'Edited before submission',
        requiredDate: new Date(Date.now() + 20 * 86400000)
          .toISOString()
          .slice(0, 10),
        items: [{ itemId: ctx.itemBId, quantity: 9 }],
      })
      .expect(200);

    expect(updated.body.priority).toBe('URGENT');
    expect(updated.body.remarks).toBe('Edited before submission');
    expect(updated.body.items).toHaveLength(1);
    expect(updated.body.items[0].itemId).toBe(ctx.itemBId);
    expect(updated.body.items[0].quantity).toBe(9);
    expect(updated.body.status).toBe('DRAFT');

    // PATCH cannot change status or approvals even if sent
    const guarded = await server()
      .patch(`/api/requirements/${reqId}`)
      .set(auth(token))
      .send({ status: 'COMPLETED', approvedById: ctx.manager.id })
      .expect(200);
    expect(guarded.body.status).toBe('DRAFT');
    expect(guarded.body.approvedById).toBeNull();
  });

  it('forbids a store keeper from editing another users DRAFT requirement', async () => {
    const created = await server()
      .post('/api/requirements')
      .set(auth(ctx.storeManager.accessToken))
      .send(makeRequirement({ requestedById: ctx.storeManager.id }))
      .expect(201);

    await server()
      .patch(`/api/requirements/${created.body.id}`)
      .set(auth(ctx.storeKeeper.accessToken))
      .send({ remarks: 'Hijacked' })
      .expect(403);
  });

  it('rejects editing a submitted requirement', async () => {
    const token = ctx.storeKeeper.accessToken;

    const create = await server()
      .post('/api/requirements')
      .set(auth(token))
      .send(makeRequirement())
      .expect(201);
    await server()
      .post(`/api/requirements/${create.body.id}/submit`)
      .set(auth(token))
      .send({})
      .expect(201);

    await server()
      .patch(`/api/requirements/${create.body.id}`)
      .set(auth(token))
      .send({ remarks: 'Too late' })
      .expect(400);
  });

  it('allows a manager to edit any DRAFT requirement', async () => {
    const created = await server()
      .post('/api/requirements')
      .set(auth(ctx.storeKeeper.accessToken))
      .send(makeRequirement())
      .expect(201);

    const updated = await server()
      .patch(`/api/requirements/${created.body.id}`)
      .set(auth(ctx.manager.accessToken))
      .send({ priority: 'HIGH', remarks: 'Manager tweak' })
      .expect(200);
    expect(updated.body.priority).toBe('HIGH');
    expect(updated.body.remarks).toBe('Manager tweak');
  });
});
